import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpsertReviewDto } from '../comments/dto/upsert-review.dto.js';
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
import { MobileDashboardResponseDto } from './dto/mobile-dashboard-response.dto.js';
import { MobileBookingsResponseDto } from './dto/mobile-bookings-response.dto.js';
import { MobileCommentsResponseDto } from './dto/mobile-comments-response.dto.js';
import { MobileProfileResponseDto } from './dto/mobile-profile-response.dto.js';
import { UpdateMobileProfileDto } from './dto/update-mobile-profile.dto.js';
import { BookingHistoryResponseDto, MobileDashboardLegacyResponseDto, UserUpdateResponseDto } from '../../common/swagger/api-response.dto.js';

const userReviewBodySchema = {
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

@ApiTags('Usuarios')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Obtiene los datos del panel de inicio móvil para el usuario autenticado mediante JWT.
   *
   * @param user Entidad del usuario autenticado extraída del token JWT.
   * @returns Datos de próximos partidos y métricas mensuales para el cliente móvil.
   */
  @Get('mobile/dashboard')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiTags('Aplicación móvil')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener los datos de Inicio para la aplicación móvil',
    description:
      'Retorna la próxima reserva y las métricas del usuario identificado por el JWT. No recibe identificadores de usuario desde el cliente.',
  })
  @ApiOkResponse({
    description: 'Datos de Inicio para el cliente móvil.',
    type: MobileDashboardResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente, inválido, expirado o usuario inactivo.',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no está autorizado.' })
  getMobileDashboard(@GetUser() user: UserEntity) {
    return this.userService.getMobileDashboardData(user.id_usuario);
  }

  /**
   * Obtiene las reservas próximas y el historial de reservas del usuario autenticado para la app móvil.
   *
   * @param user Entidad del usuario autenticado extraída del token JWT.
   * @returns Objeto con las listas de reservas próximas (`upcoming`) e historial (`history`).
   */
  @Get('mobile/bookings')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiTags('Aplicación móvil')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener próximas reservas e historial para la aplicación móvil',
    description:
      'Clasifica las reservas del usuario identificado por el JWT usando la fecha y hora de America/Santiago. No recibe identificadores de usuario desde el cliente.',
  })
  @ApiOkResponse({
    description: 'Listas de Próximas e Historial para la ventana móvil.',
    type: MobileBookingsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente, inválido, expirado o usuario inactivo.',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no está autorizado.' })
  getMobileBookings(@GetUser() user: UserEntity) {
    return this.userService.getMobileBookingsData(user.id_usuario);
  }

  /**
   * Obtiene todas las reseñas realizadas por el usuario autenticado para la aplicación móvil.
   *
   * @param user Entidad del usuario autenticado extraída del token JWT.
   * @returns Listado de comentarios del usuario formateados para la interfaz móvil.
   */
  @Get('mobile/comments')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiTags('Aplicación móvil')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener las reseñas del usuario para la aplicación móvil',
    description:
      'Retorna todas las reseñas ingresadas por el usuario identificado por el JWT (activas e inactivas). No recibe identificadores de usuario desde el cliente.',
  })
  @ApiOkResponse({
    description: 'Comentarios de la ventana móvil, del más reciente al más antiguo.',
    type: MobileCommentsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente, inválido, expirado o usuario inactivo.',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no está autorizado.' })
  getMobileComments(@GetUser() user: UserEntity) {
    return this.userService.getMobileCommentsData(user.id_usuario);
  }

  /**
   * Obtiene los datos actuales del perfil del usuario autenticado para la aplicación móvil.
   *
   * @param user Entidad del usuario autenticado extraída del token JWT.
   * @returns Datos del perfil del usuario formateados para el cliente móvil.
   */
  @Get('mobile/profile')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiTags('Aplicación móvil')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Obtener el perfil del usuario para la aplicación móvil',
    description:
      'Obtiene los datos actuales desde la base de datos usando exclusivamente el usuario identificado por el JWT.',
  })
  @ApiOkResponse({ type: MobileProfileResponseDto })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente, inválido, expirado o usuario inactivo.',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no está autorizado.' })
  @ApiNotFoundResponse({ description: 'El usuario autenticado ya no existe.' })
  getMobileProfile(@GetUser() user: UserEntity) {
    return this.userService.getMobileProfileData(user.id_usuario);
  }

  /**
   * Actualiza la información editable del perfil del usuario autenticado desde la aplicación móvil.
   *
   * @param user Entidad del usuario autenticado extraída del token JWT.
   * @param updateMobileProfileDto Campos de perfil que el usuario desea actualizar.
   * @returns Perfil actualizado del usuario junto con un mensaje de confirmación.
   */
  @Put('mobile/profile')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiTags('Aplicación móvil')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Actualizar el perfil del usuario desde la aplicación móvil',
    description:
      'Actualiza únicamente los campos editables del usuario identificado por el JWT. No permite modificar roles ni estado de la cuenta.',
  })
  @ApiBody({ type: UpdateMobileProfileDto })
  @ApiOkResponse({ type: MobileProfileResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos, fecha futura o correo ya registrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente, inválido, expirado o usuario inactivo.',
  })
  @ApiForbiddenResponse({ description: 'El rol del usuario no está autorizado.' })
  @ApiNotFoundResponse({ description: 'El usuario autenticado ya no existe.' })
  updateMobileProfile(
    @GetUser() user: UserEntity,
    @Body() updateMobileProfileDto: UpdateMobileProfileDto,
  ) {
    return this.userService.updateMobileProfileData(
      user.id_usuario,
      updateMobileProfileDto,
    );
  }

  /**
   * Obtiene los próximos partidos y las métricas mensuales de reservas de un usuario por su UUID.
   *
   * @param id_user Identificador UUID del usuario a consultar.
   * @returns Objeto con los próximos partidos y las estadísticas del mes actual.
   */
  @Get('get-dashboard-data/:id_user')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar panel histórico por UUID de usuario', description: 'Ruta heredada protegida con JWT; verifica que el usuario autenticado coincida con el UUID o sea administrador.' })
  @ApiParam({ name: 'id_user', format: 'uuid' })
  @ApiOkResponse({ type: MobileDashboardLegacyResponseDto })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para consultar otro usuario.' })
  getDashboardData(
    @Param('id_user', ParseUUIDPipe) id_user: string,
    @GetUser() user: UserEntity,
  ) {
    this.assertOwnerOrAdmin(user, id_user);
    return this.userService.getDashboardData(id_user);
  }

  /**
   * Consulta el historial con las últimas diez reservas realizadas por un usuario específico.
   *
   * @param id_user Identificador UUID del usuario.
   * @returns Objeto con el indicador de éxito y el listado de reservas del usuario.
   */
  @Get('booking-history/:id_user')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar las últimas diez reservas de un usuario', description: 'Ruta heredada protegida con JWT; devuelve reservas ordenadas de más reciente a más antigua.' })
  @ApiParam({ name: 'id_user', format: 'uuid' })
  @ApiOkResponse({ type: BookingHistoryResponseDto })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para consultar otro usuario.' })
  getBookingHistory(
    @Param('id_user', ParseUUIDPipe) id_user: string,
    @GetUser() user: UserEntity,
  ) {
    this.assertOwnerOrAdmin(user, id_user);
    return this.userService.getBookingHistory(id_user);
  }

  /**
   * Obtiene la reseña asociada a una reserva específica a partir de su identificador numérico.
   *
   * @param id_resena Identificador numérico de la reserva a consultar.
   * @returns Objeto con los datos de calificación y comentario de la reseña encontrada.
   */
  @Get('get-comment/:id_resena')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar la reseña de una reserva' })
  @ApiParam({ name: 'id_resena', type: Number, description: 'ID de la reserva.' })
  @ApiOkResponse({ schema: { type: 'object', properties: { data: { type: 'object', properties: { id_comentario: { type: 'integer' }, calificacion: { type: 'integer' }, comentario: { type: 'string' } } } } } })
  @ApiNotFoundResponse({ description: 'La reserva no tiene reseña.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para consultar esta reseña.' })
  getCommentById(
    @Param('id_resena', ParseIntPipe) id_resena: number,
    @GetUser() user: UserEntity,
  ) {
    return this.userService.getCommentById(id_resena, user);
  }

  /**
   * Registra una nueva reseña para una reserva o actualiza la existente si ya cuenta con una.
   *
   * @param body Datos de la reseña incluyendo reserva, deporte, calificación y texto del comentario.
   * @returns Respuesta con el resultado de la operación y la reseña almacenada.
   */
  @Post('create-comment')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Publicar reseña de una reserva', description: 'Si existe una reseña para la reserva, actualiza esa reseña.' })
  @ApiBody({ schema: userReviewBodySchema })
  @ApiCreatedResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, msg: { type: 'string' }, data: { type: 'object' } } } })
  @ApiBadRequestResponse({ description: 'Reserva o deporte faltante.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para reseñar esta reserva.' })
  createComment(
    @Body() body: UpsertReviewDto,
    @GetUser() user: UserEntity,
  ) {
    return this.userService.createComment(body, user);
  }

  /**
   * Actualiza la calificación y el texto de la reseña asociada a una reserva.
   *
   * @param id_reserva Identificador numérico de la reserva asociada.
   * @param body Datos actualizados de calificación y comentario.
   * @returns Objeto con el estado de la operación y el comentario actualizado.
   */
  @Put('update-comment/:id_reserva')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar reseña de una reserva' })
  @ApiParam({ name: 'id_reserva', type: Number })
  @ApiBody({ schema: { ...userReviewBodySchema, required: ['calificacion', 'comentario'] } })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, msg: { type: 'string' }, data: { type: 'object' } } } })
  @ApiNotFoundResponse({ description: 'No existe reseña para la reserva.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para editar esta reseña.' })
  updateComment(
    @Param('id_reserva', ParseIntPipe) id_reserva: number,
    @Body() body: UpsertReviewDto,
    @GetUser() user: UserEntity,
  ) {
    return this.userService.updateComment(id_reserva, body, user);
  }

  /**
   * Lista todas las reseñas realizadas por un usuario (activas e inactivas) junto con los datos de reserva y cancha.
   *
   * @param id_user Identificador UUID del usuario.
   * @returns Objeto con el indicador de éxito y el listado de reseñas del usuario.
   */
  @Get('get-user-comments/:id_user')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Listar reseñas de un usuario', description: 'Incluye todas las reseñas del usuario (activas y desactivadas), deporte, reserva y cancha; protegida con JWT.' })
  @ApiParam({ name: 'id_user', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' }, comentarios: { type: 'array', items: { type: 'object', properties: { id_comentario: { type: 'integer' }, id_servicio: { type: 'string', format: 'uuid' }, nombre_servicio: { type: 'string' }, calificacion: { type: 'integer' }, comentario: { type: 'string' }, reserva: { type: 'object' }, pista: { type: 'object' } } } } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para consultar reseñas de otro usuario.' })
  getUserComments(
    @Param('id_user', ParseUUIDPipe) id_user: string,
    @GetUser() user: UserEntity,
  ) {
    this.assertOwnerOrAdmin(user, id_user);
    return this.userService.getUserComments(id_user);
  }

  /**
   * Actualiza los datos personales y de cuenta de un usuario identificado por su UUID.
   *
   * @param id_user Identificador UUID del usuario a modificar.
   * @param updateUserDto Datos del perfil del usuario que se desean actualizar.
   * @returns Respuesta con el indicador de éxito, mensaje y la entidad del usuario actualizada.
   */
  @Put('update-user/:id_user')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar perfil de usuario por UUID', description: 'Actualiza únicamente los datos personales del propietario autenticado o por un administrador. No permite modificar roles ni estado de cuenta.' })
  @ApiParam({ name: 'id_user', format: 'uuid' })
  @ApiOkResponse({ type: UserUpdateResponseDto })
  @ApiBadRequestResponse({ description: 'UUID o datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No autorizado para modificar otro usuario.' })
  @ApiNotFoundResponse({ description: 'Usuario inexistente.' })
  updateUser(
    @Param('id_user', ParseUUIDPipe) id_user: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: UserEntity,
  ) {
    this.assertOwnerOrAdmin(user, id_user);
    return this.userService.updateUser(id_user, updateUserDto);
  }

  private assertOwnerOrAdmin(user: UserEntity, targetUserId: string): void {
    const isAdmin =
      user.roles?.includes(ValidRoles.admin) ||
      user.roles?.includes(ValidRoles.superUser);
    if (user.id_usuario !== targetUserId && !isAdmin) {
      throw new ForbiddenException({
        ok: false,
        msg: 'No tienes permisos para acceder o modificar datos de otro usuario',
      });
    }
  }
}
