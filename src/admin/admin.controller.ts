import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { ValidRoles } from '../auth/interfaces/valid-roles.js';
import {
  AdminUpdateCommentStatusDto,
  AdminUpdateCourtDto,
  AdminUpdateUserDto,
} from './dto/admin-actions.dto.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActionMessageResponseDto, CourtUpdateResponseDto, UserUpdateResponseDto } from '../common/swagger/api-response.dto.js';

@ApiTags('Administración')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Obtiene los indicadores y la actividad del panel administrativo.
   *
   * @returns Las métricas, tendencias, estado de canchas y próximas reservas.
   */
  @Get('dashboard')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Obtener indicadores y tendencias del panel administrativo', description: 'Incluye KPIs, tendencias de 7 y 30 días, estado de pistas y próximas reservas. Requiere rol administrador.' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'object', properties: { kpis: { type: 'object' }, tendencia: { type: 'object' }, estadoPistas: { type: 'array', items: { type: 'object' } }, proximoCierre: { type: 'string' }, proximasReservas: { type: 'array', items: { type: 'object' } } } } } },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  getDashboardData() {
    return this.adminService.getDashboardData();
  }

  /**
   * Actualiza el nombre y el precio por hora de una cancha.
   *
   * @param id Identificador numérico de la cancha.
   * @param body Nombre y precio por hora que se guardarán.
   * @returns El resultado de la operación junto con la cancha actualizada.
   */
  @Put('update-court/:id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Editar nombre y precio por hora de una cancha', description: 'Requiere rol administrador.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID numérico de la cancha.' })
  @ApiBody({ type: AdminUpdateCourtDto })
  @ApiOkResponse({ type: CourtUpdateResponseDto })
  @ApiBadRequestResponse({ description: 'ID o datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  @ApiNotFoundResponse({ description: 'Cancha inexistente.' })
  updateCourt(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminUpdateCourtDto,
  ) {
    return this.adminService.updateCourt(id, body);
  }

  /**
   * Activa o desactiva un comentario.
   *
   * @param id Identificador numérico del comentario.
   * @param body Nuevo estado de activación del comentario.
   * @returns El resultado de la actualización del estado.
   */
  @Put('comentarios/:id/estado')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Activar o desactivar un comentario', description: 'Requiere rol administrador.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID numérico del comentario.' })
  @ApiBody({ type: AdminUpdateCommentStatusDto })
  @ApiOkResponse({ type: ActionMessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  @ApiNotFoundResponse({ description: 'Comentario inexistente.' })
  updateCommentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminUpdateCommentStatusDto,
  ) {
    return this.adminService.updateCommentStatus(id, body.is_active);
  }

  /**
   * Modifica los roles o el estado de una cuenta desde administración.
   *
   * @param id UUID del usuario que se actualizará.
   * @param body Roles o estado de activación que se modificarán.
   * @returns El resultado de la operación junto con el usuario actualizado.
   */
  @Put('usuarios/:id')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Cambiar roles o estado de un usuario (administrador)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'UUID del usuario.' })
  @ApiBody({ type: AdminUpdateUserDto })
  @ApiOkResponse({ type: UserUpdateResponseDto })
  @ApiBadRequestResponse({ description: 'UUID o datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  @ApiNotFoundResponse({ description: 'Usuario inexistente.' })
  updateUserByAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUserByAdmin(id, body);
  }
}
