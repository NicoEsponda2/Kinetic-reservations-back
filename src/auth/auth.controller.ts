import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserDto, LoginUserDto } from './dto/index.js';
import { Auth } from './decorators/auth.decorator.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { UserEntity } from './entities/user.entity.js';
import { ValidRoles } from './interfaces/valid-roles.js';
import { PaginationDto } from '../common/dtos/pagination.dto.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthSessionResponseDto } from '../common/swagger/api-response.dto.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registra un usuario y crea su sesión de autenticación.
   *
   * @param createUserDto Datos requeridos para crear la cuenta.
   * @returns Una promesa con el usuario registrado y su token JWT.
   */
  @Post('register')
  @ApiOperation({ summary: 'Registrar usuario y crear sesión' })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos o correo ya registrado.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  /**
   * Inicia sesión con las credenciales de un usuario.
   *
   * @param loginUserDto Correo y contraseña utilizados para autenticar la cuenta.
   * @returns Una promesa con el usuario autenticado y su token JWT.
   */
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Formato de credenciales inválido.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas o cuenta inactiva.' })
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  /**
   * Renueva la sesión del usuario autenticado.
   *
   * @param user Usuario obtenido desde el token JWT vigente.
   * @returns Una promesa con el usuario y un nuevo token JWT.
   */
  @Get('renew')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Renovar JWT y obtener el usuario autenticado' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'JWT ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  checkAuthStatus(@GetUser() user: UserEntity) {
    return this.authService.checkAuthStatus(user);
  }

  /**
   * Lista los usuarios junto con sus estadísticas de reservas.
   *
   * @param paginationDto Límite y desplazamiento aplicados a la consulta.
   * @returns Una promesa con la colección paginada de usuarios y sus estadísticas.
   */
  @Get('/admin/find-users')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Listar usuarios con estadísticas de reservas',
    description: 'Ruta administrativa del panel. Exige JWT con rol admin; limit y offset controlan la paginación.',
  })
  @ApiOkResponse({
    schema: { type: 'object', properties: { usuarios: { type: 'array', items: { type: 'object', properties: { id_usuario: { type: 'string', format: 'uuid' }, nombre: { type: 'string' }, email: { type: 'string' }, cantidad_reservas: { type: 'number' }, total_gastado: { type: 'number' } } } } } },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  findAllUsers(@Query() paginationDto: PaginationDto){
      return this.authService.findAllUsers(paginationDto);
  }

  /**
   * Comprueba el acceso de un usuario con rol de administrador.
   *
   * @param user Usuario administrador obtenido desde el token JWT.
   * @returns Un objeto que confirma el acceso e incluye al usuario autenticado.
   */
  @Get('private2')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Comprobar acceso privado con rol administrador' })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, user: { type: 'object', properties: { id_usuario: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' }, roles: { type: 'array', items: { type: 'string' } } } } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  privateRoute2(@GetUser() user: UserEntity) {
    return {
      ok: true,
      user,
    };
  }

  /**
   * Devuelve información de diagnóstico de una petición autenticada.
   *
   * @param request Petición HTTP validada por la estrategia JWT.
   * @param user Usuario obtenido desde el token JWT.
   * @param userEmail Correo extraído del usuario autenticado.
   * @param rawHeaders Cabeceras originales de la petición.
   * @param headers Cabeceras HTTP procesadas por NestJS.
   * @returns Los datos de diagnóstico de la petición y del usuario autenticado.
   */
  @Get('private')
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Comprobar JWT de administrador', description: 'Ruta de diagnóstico restringida a administradores.' })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, message: { type: 'string' }, user: { type: 'object' }, userEmail: { type: 'string', format: 'email' } } } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  testingPrivateRoute(
    @GetUser() user: UserEntity,
    @GetUser('email') userEmail: string,
  ) {
    return {
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail,
    };
  }

  // @SetMetadata('roles', ['admin','super-user'])
  // @Get('private2')
  // @RoleProtected( ValidRoles.superUser, ValidRoles.admin )
  // @UseGuards( AuthGuard(), UserRoleGuard )
  // privateRoute2(
  //   @GetUser() user: User
  // ) {

  //   return {
  //     ok: true,
  //     user
  //   }
  // }
}
