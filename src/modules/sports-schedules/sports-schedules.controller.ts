import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { SportsSchedulesService } from './sports-schedules.service.js';
import { CreateSportsScheduleDto } from './dto/create-sports-schedule.dto.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { CheckAvailabilityDto } from './dto/checkavailability.dto.js';
import { GetAvailabilityDto } from './dto/getAvailability.dto.js';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AvailabilityResponseDto } from '../../common/swagger/api-response.dto.js';

@ApiTags('Horarios deportivos')
@Controller('sports-schedules')
export class SportsSchedulesController {
  constructor(
    private readonly sportsSchedulesService: SportsSchedulesService,
  ) {}

  /**
   * Registra un nuevo bloque de horario semanal para un servicio deportivo.
   *
   * @param createSportsScheduleDto Datos del horario semanal a crear.
   * @returns El DTO del horario semanal registrado.
   */
  @Post()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear horario semanal para un deporte (administrador)' })
  @ApiCreatedResponse({ type: CreateSportsScheduleDto, description: 'Devuelve los datos recibidos después de guardar el horario.' })
  @ApiBadRequestResponse({ description: 'Horario inválido o duplicado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado.' })
  create(@Body() createSportsScheduleDto: CreateSportsScheduleDto) {
    return this.sportsSchedulesService.create(createSportsScheduleDto);
  }

  /**
   * Consulta los bloques horarios disponibles enviando los filtros en el cuerpo de la petición.
   *
   * @param checkAvailabilityDto Identificador del servicio, cancha y fecha a consultar.
   * @returns Objeto con el listado de tramos horarios de 60 minutos disponibles.
   */
  @Get()
  @ApiOperation({ summary: 'Consultar disponibilidad (ruta heredada)', description: 'Esta ruta espera un cuerpo en GET, que Swagger UI no envía de forma fiable. Utilice GET /sports-schedules/get-available-times con parámetros de consulta.' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'Falta id_pista o datos de búsqueda inválidos.' })
  findAvailableTimes(@Body() checkAvailabilityDto: CheckAvailabilityDto) {
    return this.sportsSchedulesService.findAvailableTimes(checkAvailabilityDto);
  }

  /**
   * Obtiene los bloques horarios libres de 60 minutos para un deporte, cancha y fecha mediante query params.
   *
   * @param query Parámetros de consulta con `id_servicio`, `id_pista` y `fecha`.
   * @returns Objeto con el indicador de éxito y los bloques horarios disponibles.
   */
  @Get('get-available-times')
  @ApiOperation({ summary: 'Consultar bloques horarios disponibles de una cancha', description: 'Devuelve intervalos de 60 minutos libres para el deporte, cancha y fecha indicados.' })
  @ApiQuery({ name: 'id_servicio', description: 'UUID del deporte.', example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4' })
  @ApiQuery({ name: 'id_pista', type: Number, example: 1 })
  @ApiQuery({ name: 'fecha', description: 'Fecha YYYY-MM-DD.', example: '2026-11-06' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'Fecha, deporte o cancha inválidos.' })
  async getAvailableSchedules(@Query() query: GetAvailabilityDto) {
    return await this.sportsSchedulesService.findAvailableTimes(query);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.sportsSchedulesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateSportsScheduleDto: UpdateSportsScheduleDto,
  // ) {
  //   return this.sportsSchedulesService.update(+id, updateSportsScheduleDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.sportsSchedulesService.remove(+id);
  // }
}
