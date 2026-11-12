import { Controller, Get } from '@nestjs/common';
import { SeedService } from './seed.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { ValidRoles } from '../auth/interfaces/valid-roles.js';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('Datos de prueba')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * Ejecuta el proceso de reinicio y carga de datos de prueba en la base de datos.
   *
   * @returns Mensaje de confirmación indicando que los datos de prueba fueron cargados.
   */
  @Get()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Recrear datos de ejemplo (administrador)', description: 'Operación destructiva: elimina los datos actuales de usuarios, deportes, reservas, pagos y comentarios antes de cargar los datos de prueba. Solo debe ejecutarse en un entorno de prueba.' })
  @ApiOkResponse({ description: 'Resultado de la carga de datos de ejemplo.', schema: { type: 'string', example: 'DATOS DE PRUEBA CARGADOS' } })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  executeSeed() {
    return this.seedService.runSeed();
  }
}
