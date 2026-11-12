import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { GetUser } from '../../auth/decorators/get-user.decorator.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BookingRecordDto } from '../../common/swagger/api-response.dto.js';

@ApiTags('Reservas')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Crea un nuevo registro de reserva en la base de datos.
   *
   * @param createBookingDto Datos necesarios para registrar la reserva.
   * @returns Entidad de la reserva creada.
   */
  @Post()
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear una reserva', description: 'Recibe cancha, fecha y tramo horario; exige JWT válido y calcula el precio desde la base de datos.' })
  @ApiCreatedResponse({ type: BookingRecordDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos, horario ocupado o conflicto con una restricción de base de datos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: UserEntity,
  ) {
    return this.bookingsService.create(createBookingDto, user);
  }

  /**
   * Obtiene el historial global de reservas formateado para el panel de administración.
   *
   * @returns Respuesta con el listado de reservas incluyendo usuario, cancha y servicio.
   */
  @Get('/admin/bookings-history')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Listar historial global para administración', description: 'Retorna todas las reservas con nombre del usuario y deporte; requiere rol administrador.' })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'array', items: { type: 'object', properties: { id_reserva: { type: 'integer' }, fecha: { type: 'string', format: 'date' }, hora_inicio: { type: 'string' }, precio_cobrado: { type: 'number' }, estado: { type: 'string' }, pista: { type: 'string' }, servicio: { type: 'string' }, id_servicio: { type: 'string', format: 'uuid' }, usuario_nombre: { type: 'string' }, avatar: { type: 'string', nullable: true } } } } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  bookingHistory() {
    return this.bookingsService.findBookingHistory();
  }

  /**
   * Lista todas las reservas registradas en el sistema junto con su usuario y cancha.
   *
   * @returns Objeto con el arreglo de reservas encontradas.
   */
  @Get()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Listar todas las reservas', description: 'Listado global; requiere rol administrador.' })
  @ApiOkResponse({ schema: { type: 'object', properties: { data: { type: 'object', properties: { reservas: { type: 'array', items: { type: 'object' } } } } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  findAll() {
    return this.bookingsService.findAll();
  }

  /**
   * Consulta una reserva específica a partir de su identificador numérico.
   *
   * @param id Identificador numérico de la reserva en formato texto.
   * @returns Mensaje o información correspondiente a la reserva consultada.
   */
  @Get(':id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar reserva por ID (marcador de posición)', description: 'Todavía devuelve un texto de ejemplo; no consulta la base de datos.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID numérico de la reserva.' })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción devuelve la reserva n.º 1' } })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(+id);
  }

  /**
   * Actualiza parcialmente los datos de una reserva existente por su identificador.
   *
   * @param id Identificador numérico de la reserva en formato texto.
   * @param updateBookingDto Campos de la reserva que se desean actualizar.
   * @returns Mensaje o resultado de la actualización de la reserva.
   */
  @Patch(':id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar reserva (marcador de posición)', description: 'Recibe datos parciales, pero todavía devuelve un texto de ejemplo y no modifica la base de datos.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID numérico de la reserva.' })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción actualiza la reserva n.º 1' } })
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(+id, updateBookingDto);
  }

  /**
   * Elimina una reserva específica según su identificador numérico.
   *
   * @param id Identificador numérico de la reserva en formato texto.
   * @returns Mensaje o resultado de la eliminación de la reserva.
   */
  @Delete(':id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Eliminar reserva (marcador de posición)', description: 'Todavía devuelve un texto de ejemplo y no elimina registros.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID numérico de la reserva.' })
  @ApiOkResponse({ schema: { type: 'string', example: 'Esta acción elimina la reserva n.º 1' } })
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(+id);
  }
}
