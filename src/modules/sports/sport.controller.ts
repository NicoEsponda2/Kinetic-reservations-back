import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SportService } from './sport.service.js';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { assertValidImageMagicBytes, fileFilter } from '../../files/helpers/index.js';
import {
  CreateSportDto,
  CreateSportMultipartDto,
  SportCourtInputDto,
  SportScheduleInputDto,
} from './dto/create-sport.dto.js';
import {
  UpdateSportDto,
  UpdateSportMultipartDto,
} from './dto/update-sport.dto.js';
import {
  HttpErrorResponseDto,
  SportDetailPlainResponseDto,
  SportHomeResponseDto,
  SportListResponseDto,
  SportMutationResponseDto,
  SportNamesResponseDto,
} from './dto/sport-response.dto.js';

@ApiTags('Deportes')
@ApiExtraModels(
  SportCourtInputDto,
  SportScheduleInputDto,
  CreateSportDto,
  UpdateSportDto,
)
@Controller('sport')
export class SportController {
  constructor(private readonly sportService: SportService) {}

  /**
   * Crea un nuevo servicio deportivo junto con su imagen principal, galería, canchas y horarios.
   *
   * @param createSportDto Datos base del servicio deportivo, pistas y horarios en formato multipart.
   * @param files Archivos multimedia recibidos (`imagen_principal` y galería `imagenes`).
   * @returns Mensaje de confirmación junto con el detalle del servicio deportivo creado.
   */
  @Post('/admin/create-sport')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imagen_principal', maxCount: 1 },
        { name: 'imagenes', maxCount: 10 },
      ],
      {
        fileFilter: fileFilter,
        limits: { fileSize: 1024 * 1024 * 5 },
      },
    ),
  )
  @ApiOperation({
    summary: 'Crear un nuevo servicio deportivo',
    description:
      'Registra un servicio deportivo completo en una transacción atómica incluyendo sus datos base, imagen de portada en Cloudinary, galería de hasta 10 imágenes, canchas asociadas (`pistas`) y bloques de horarios semanales (`horarios`). Requiere autenticación JWT con rol `admin`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Datos del servicio deportivo y archivos multimedia (`imagen_principal` e `imagenes`) enviados mediante `multipart/form-data`.',
    type: CreateSportMultipartDto,
  })
  @ApiCreatedResponse({
    description: 'Servicio deportivo creado exitosamente.',
    type: SportMutationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos de entrada inválidos, JSON malformado en `pistas`/`horarios`, violación de unicidad o error al subir imágenes a Cloudinary.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente, inválido o expirado.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Acceso denegado: el usuario autenticado no posee el rol `admin`.',
    type: HttpErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno inesperado al procesar la transacción.',
    type: HttpErrorResponseDto,
  })
  async create(
    @Body() createSportDto: CreateSportDto,
    @UploadedFiles()
    files: {
      imagen_principal?: Express.Multer.File[];
      imagenes?: Express.Multer.File[];
    },
  ) {
    const imagen_principal_file = files?.imagen_principal?.[0];
    const gallery_files = files?.imagenes || [];

    if (imagen_principal_file?.buffer) {
      assertValidImageMagicBytes(imagen_principal_file.buffer);
    }
    for (const gf of gallery_files) {
      if (gf?.buffer) {
        assertValidImageMagicBytes(gf.buffer);
      }
    }

    const payload = {
      ...createSportDto,
      imagen_principal: imagen_principal_file,
      gallery_files: gallery_files,
    };

    return await this.sportService.create(payload);
  }

  /**
   * Obtiene el catálogo de servicios deportivos activos enriquecido para la página de inicio.
   *
   * @returns Objeto con los deportes activos, sus canchas, precio mínimo y calificación promedio.
   */
  @Get('home')
  @ApiOperation({
    summary: 'Obtener catálogo de deportes activos para la página de inicio',
    description:
      'Ruta pública optimizada para la página de inicio. Retorna únicamente los servicios deportivos activos junto con sus canchas habilitadas, tarifa mínima por hora (`precio_desde`), calificación promedio y total de reseñas.',
  })
  @ApiOkResponse({
    description:
      'Catálogo enriquecido de servicios deportivos obtenido correctamente.',
    type: SportHomeResponseDto,
  })
  getHome() {
    return this.sportService.findHomePage();
  }

  /**
   * Lista todos los servicios deportivos registrados (activos e inactivos) para el panel administrativo.
   *
   * @param paginationDto Parámetros de límite y desplazamiento para paginar la consulta.
   * @returns Objeto con el arreglo de servicios deportivos encontrados.
   */
  @Get('/admin/find-sports')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los servicios deportivos (panel de administración)',
    description:
      'Retorna el listado paginado de servicios deportivos (tanto activos como inactivos) para su gestión en el panel administrativo. Requiere autenticación JWT con rol `admin`.',
  })
  @ApiOkResponse({
    description:
      'Listado administrativo de servicios deportivos obtenido correctamente.',
    type: SportListResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente, inválido o expirado.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Acceso denegado: el usuario autenticado no posee el rol `admin`.',
    type: HttpErrorResponseDto,
  })
  getSportsAdmin(@Query() paginationDto: PaginationDto) {
    return this.sportService.findAllAdmin(paginationDto);
  }

  /**
   * Obtiene el listado ligero de nombres de deportes activos junto con sus canchas habilitadas.
   *
   * @returns Objeto con el indicador de éxito y los deportes activos con sus respectivas canchas.
   */
  @Get('get-sports-names')
  @ApiOperation({
    summary: 'Listar nombres de deportes activos y sus canchas habilitadas',
    description:
      'Ruta pública ligera utilizada por los selectores de nueva reserva y filtros de interfaz. Retorna únicamente deportes activos con el identificador, nombre y tarifa por hora de sus canchas activas.',
  })
  @ApiOkResponse({
    description:
      'Listado resumido de deportes y canchas activas obtenido correctamente.',
    type: SportNamesResponseDto,
  })
  getSportsNames() {
    return this.sportService.findSportsNames();
  }

  /**
   * Lista de forma paginada los servicios deportivos registrados en el sistema.
   *
   * @param paginationDto Parámetros opcionales de paginación (`limit` y `offset`).
   * @returns Objeto con el listado paginado de servicios deportivos.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar servicios deportivos con paginación',
    description:
      'Consulta paginada general de los servicios deportivos registrados con su información resumida (`id_deporte`, `nombre`, `descripcion`, `imagen_principal`, `is_active`).',
  })
  @ApiOkResponse({
    description: 'Listado paginado de servicios deportivos.',
    type: SportListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de paginación (`limit` u `offset`) inválidos.',
    type: HttpErrorResponseDto,
  })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.sportService.findAll(paginationDto);
  }

  /**
   * Obtiene la información detallada de un servicio deportivo buscando por UUID o por nombre.
   *
   * @param term Identificador UUID v4 o nombre del servicio deportivo.
   * @returns Detalle completo del deporte con sus URLs de imágenes aplanadas, canchas y horarios.
   */
  @Get(':term')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el detalle completo de un deporte por UUID o nombre',
    description:
      'Busca un servicio deportivo por su `id_deporte` (UUID v4) o por su `nombre` exacto (insensible a mayúsculas/minúsculas). Retorna sus datos, galería de URLs aplanada (`imagenes: string[]`), canchas ordenadas y bloques horarios ordenados de Lunes a Domingo. Requiere rol `admin`.',
  })
  @ApiParam({
    name: 'term',
    description:
      'UUID v4 del servicio deportivo (`id_deporte`) o nombre del deporte',
    examples: {
      porUuid: {
        summary: 'Búsqueda por UUID',
        value: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
      },
      porNombre: {
        summary: 'Búsqueda por nombre',
        value: 'Tenis',
      },
    },
  })
  @ApiOkResponse({
    description: 'Detalle completo del servicio deportivo encontrado.',
    type: SportDetailPlainResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente, inválido o expirado.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Acceso denegado: el usuario autenticado no posee el rol `admin`.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe ningún servicio deportivo que coincida con el término buscado.',
    type: HttpErrorResponseDto,
  })
  findOne(@Param('term') term: string) {
    return this.sportService.findOnePlain(term);
  }

  /**
   * Actualiza de forma integral un servicio deportivo, sincronizando imágenes, canchas y horarios.
   *
   * @param id Identificador UUID del servicio deportivo a modificar.
   * @param updateSportDto Campos de actualización del deporte, canchas, horarios e imágenes.
   * @param files Nuevos archivos multimedia opcionales (`imagen_principal` e `imagenes`).
   * @returns Mensaje de confirmación junto con la entidad del deporte actualizada.
   */
  @Put('admin/update-sport/:id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imagen_principal', maxCount: 1 }, // Captura la portada única
        { name: 'imagenes', maxCount: 10 }, // Captura el arreglo de la galería
      ],
      {
        fileFilter: fileFilter,
        limits: { fileSize: 1024 * 1024 * 5 },
      },
    ),
  )
  @ApiOperation({
    summary: 'Actualizar integralmente un servicio deportivo existente',
    description:
      'Actualiza de forma transaccional la información base de un deporte, su imagen de portada, sincroniza altas/bajas de su galería en Cloudinary (`imagenes_existentes`, `imagenes_eliminadas`, nuevos archivos `imagenes`), sus canchas (`pistas`) y reemplaza su programación horaria (`horarios`). Requiere autenticación JWT con rol `admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID v4 del servicio deportivo a actualizar (`id_deporte`)',
    format: 'uuid',
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Campos a modificar y archivos multimedia opcionales enviados mediante `multipart/form-data`.',
    type: UpdateSportMultipartDto,
  })
  @ApiOkResponse({
    description: 'Servicio deportivo actualizado exitosamente.',
    type: SportMutationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'UUID inválido, formato JSON incorrecto en campos compuestos o error al subir imágenes a Cloudinary.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente, inválido o expirado.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Acceso denegado: el usuario autenticado no posee el rol `admin`.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'El servicio deportivo con el UUID indicado no existe.',
    type: HttpErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSportDto: UpdateSportDto,
    @UploadedFiles()
    files: {
      imagen_principal?: Express.Multer.File[];
      imagenes?: Express.Multer.File[];
    },
  ) {
    // 1. Extraemos el archivo individual de la portada (si el usuario seleccionó uno nuevo)
    const imagen_principal_file = files?.imagen_principal?.[0];

    // 2. Extraemos el arreglo de archivos de la galería (si el usuario subió fotos nuevas)
    const gallery_files = files?.imagenes || [];

    if (imagen_principal_file?.buffer) {
      assertValidImageMagicBytes(imagen_principal_file.buffer);
    }
    for (const gf of gallery_files) {
      if (gf?.buffer) {
        assertValidImageMagicBytes(gf.buffer);
      }
    }

    // 3. Unificamos todo en un solo objeto para pasárselo al Service de manera limpia
    const payload = {
      ...updateSportDto,
      imagen_principal: imagen_principal_file, // Sobrescribimos con el archivo binario
      gallery_files: gallery_files, // Añadimos la galería mapeada
    };

    return await this.sportService.update(id, payload);
  }

  /**
   * Elimina permanentemente un servicio deportivo y sus relaciones asociadas según su UUID.
   *
   * @param id Identificador UUID del servicio deportivo a eliminar.
   * @returns Promesa resuelta una vez eliminado el registro.
   */
  @Delete(':id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar un servicio deportivo por UUID',
    description:
      'Elimina permanentemente un servicio deportivo identificado por su UUID junto con sus imágenes, canchas y horarios asociados en cascada. Requiere autenticación JWT con rol `admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID v4 del servicio deportivo a eliminar (`id_deporte`)',
    format: 'uuid',
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
  })
  @ApiOkResponse({
    description: 'Servicio deportivo eliminado correctamente.',
  })
  @ApiBadRequestResponse({
    description: 'El parámetro `id` no tiene un formato UUID válido.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT ausente, inválido o expirado.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Acceso denegado: el usuario autenticado no posee el rol `admin`.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No se encontró ningún servicio deportivo con el UUID especificado.',
    type: HttpErrorResponseDto,
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sportService.remove(id);
  }
}
