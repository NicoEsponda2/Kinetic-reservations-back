import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { UpsertReviewDto } from './dto/upsert-review.dto.js';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { GetUser } from '../../auth/decorators/get-user.decorator.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CommentRecordDto } from '../../common/swagger/api-response.dto.js';

const reviewBodySchema = {
  type: 'object' as const,
  required: ['id_reserva', 'calificacion', 'comentario'],
  properties: {
    id_reserva: { type: 'integer' as const, example: 42 },
    id_servicio: { type: 'string' as const, format: 'uuid', description: 'UUID del deporte; alternativa a id_deporte.' },
    id_deporte: { type: 'string' as const, format: 'uuid' },
    calificacion: { type: 'integer' as const, minimum: 1, maximum: 5 },
    comentario: { type: 'string' as const, example: 'Excelente experiencia.' },
  },
};

@ApiTags('Comentarios')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Crea un nuevo comentario a partir del DTO general de creación.
   *
   * @param createCommentDto Datos del comentario que se desea registrar.
   * @returns Entidad del comentario almacenado en la base de datos.
   */
  @Post()
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear comentario mediante el DTO general', description: 'Devuelve la entidad guardada.' })
  @ApiCreatedResponse({ type: CommentRecordDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos o comentario duplicado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para comentar esta reserva.' })
  create(
    @Body() createCommentDto: CreateCommentDto,
    @GetUser() user: UserEntity,
  ) {
    return this.commentsService.create(createCommentDto, user);
  }

  /**
   * Registra una nueva reseña asociada a una reserva o actualiza la existente si ya fue comentada.
   *
   * @param body Datos de la reseña incluyendo reserva, servicio, calificación y texto del comentario.
   * @returns Objeto con el estado de la operación, mensaje descriptivo y la reseña guardada.
   */
  @Post('create-review')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear o actualizar reseña de una reserva', description: 'Si la reserva ya tiene reseña, actualiza la existente.' })
  @ApiBody({ schema: reviewBodySchema })
  @ApiCreatedResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, msg: { type: 'string' }, data: { type: 'object' } } } })
  @ApiBadRequestResponse({ description: 'Faltan reserva o deporte.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para comentar esta reserva.' })
  crearResena(
    @Body() body: UpsertReviewDto,
    @GetUser() user: UserEntity,
  ) {
    return this.commentsService.crearResena(body, user);
  }

  /**
   * Actualiza la calificación y el texto de una reseña existente vinculada a una reserva.
   *
   * @param id_reserva Identificador numérico de la reserva asociada al comentario.
   * @param body Nuevos datos de calificación y comentario para la reseña.
   * @returns Objeto con el resultado de la actualización y los datos actualizados.
   */
  @Put('update-review/:id_reserva')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar reseña asociada a una reserva' })
  @ApiParam({ name: 'id_reserva', type: Number })
  @ApiBody({ schema: { ...reviewBodySchema, required: ['calificacion', 'comentario'] } })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, msg: { type: 'string' }, data: { type: 'object' } } } })
  @ApiNotFoundResponse({ description: 'No existe reseña para esta reserva.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para editar esta reseña.' })
  actualizarResena(
    @Param('id_reserva', ParseIntPipe) id_reserva: number,
    @Body() body: UpsertReviewDto,
    @GetUser() user: UserEntity,
  ) {
    return this.commentsService.actualizarResena(id_reserva, body, user);
  }

  /**
   * Obtiene el listado completo de comentarios para su gestión en el panel administrativo.
   *
   * @param paginationDto Parámetros opcionales de paginación de la consulta.
   * @returns Objeto con el arreglo de comentarios y los datos del usuario y deporte asociados.
   */
  @Get('/admin/find-comments')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Listar comentarios del panel administrativo', description: 'Incluye usuario y deporte; requiere rol administrador.' })
  @ApiOkResponse({ schema: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: { id_comentario: { type: 'integer' }, id_usuario: { type: 'string', format: 'uuid' }, nombre: { type: 'string' }, apellido: { type: 'string' }, deporte: { type: 'string' }, calificacion: { type: 'integer' }, comentario: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, is_active: { type: 'integer', enum: [0, 1] } } } } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  findAllAdmin(@Query() paginationDto: PaginationDto) {
    return this.commentsService.findAllAdmin(paginationDto);
  }

  /**
   * Obtiene las reseñas activas formateadas para mostrarse en la página principal pública.
   *
   * @returns Objeto con la lista de comentarios públicos activos.
   */
  @Get('home-page')
  @ApiOperation({ summary: 'Listar reseñas activas para la página pública' })
  @ApiOkResponse({ schema: { type: 'object', properties: { comentarios: { type: 'array', items: { type: 'object', properties: { deporte: { type: 'string' }, titulo: { type: 'string' }, calificacion: { type: 'integer' }, comentario: { type: 'string' }, nombre: { type: 'string' }, fecha: { type: 'string' }, avatar: { type: 'string' } } } } } } })
  findHomePage() {
    return this.commentsService.findHomePage();
  }

  /**
   * Consulta un comentario específico según su identificador numérico.
   *
   * @param id Identificador numérico del comentario en formato texto.
   * @returns Mensaje o información correspondiente al comentario solicitado.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Consultar comentario por ID (marcador de posición)', description: 'Todavía devuelve un texto de ejemplo; no consulta la base de datos.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción devuelve el comentario n.º 1' } })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(+id);
  }

  /**
   * Actualiza parcialmente un comentario específico según su identificador.
   *
   * @param id Identificador numérico del comentario en formato texto.
   * @param updateCommentDto Datos parciales del comentario a modificar.
   * @returns Mensaje o resultado de la actualización del comentario.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar comentario (marcador de posición)', description: 'Todavía devuelve un texto de ejemplo y no modifica registros.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción actualiza el comentario n.º 1' } })
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(+id, updateCommentDto);
  }

  /**
   * Elimina un comentario específico a partir de su identificador numérico.
   *
   * @param id Identificador numérico del comentario en formato texto.
   * @returns Mensaje o resultado de la eliminación del comentario.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar comentario (marcador de posición)', description: 'Todavía devuelve un texto de ejemplo y no elimina registros.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción elimina el comentario n.º 1' } })
  remove(@Param('id') id: string) {
    return this.commentsService.remove(+id);
  }
}
