import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SportEntity, SportImageEntity } from './entities/index.js';
import { DataSource, In, Not, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';

import { validate as isUUID } from 'uuid';
import { SportsScheduleEntity } from '../sports-schedules/entities/sports-schedule.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { CommentsEntity } from '../comments/entities/comment.entity.js';
import { CloudinaryService } from '../../files/cloudinary/cloudinary.service.js';

@Injectable()
export class SportService {
  private readonly logger = new Logger('SportService');
  constructor(
    @InjectRepository(SportEntity)
    private readonly sportRepository: Repository<SportEntity>,

    @InjectRepository(SportImageEntity)
    private readonly sportImageRepository: Repository<SportImageEntity>,

    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,

    @InjectRepository(SportsScheduleEntity)
    private readonly sportsScheduleRepository: Repository<SportsScheduleEntity>,

    @InjectRepository(CommentsEntity)
    private readonly commentRepository: Repository<CommentsEntity>,

    private readonly dataSource: DataSource,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Registra un nuevo servicio deportivo en una transacción junto con sus imágenes, canchas y horarios.
   *
   * @param createData Datos del servicio deportivo, arreglos de pistas/horarios y archivos multimedia.
   * @returns Mensaje de éxito junto con la entidad completa del servicio deportivo creado.
   */
  async create(createData: any) {
    const {
      horarios: rawHorarios,
      pistas: rawPistas,
      imagen_principal: imagen_principal_file,
      gallery_files,
      ...sportData
    } = createData;

    const horarios = this.parseJsonField<any[]>(rawHorarios, 'horarios');
    const pistas = this.parseJsonField<any[]>(rawPistas, 'pistas');
    this.validateCourtsAndSchedules(pistas, horarios);

    if (sportData.is_active !== undefined) {
      sportData.is_active =
        sportData.is_active === true ||
        sportData.is_active === 'true' ||
        sportData.is_active === 1 ||
        sportData.is_active === '1';
    }

    let imagenPrincipalUrl =
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/faujurn3xy5ypgdmno6e.jpg';

    if (imagen_principal_file) {
      try {
        const uploadedMain = await this.cloudinaryService.uploadFile(
          imagen_principal_file,
        );
        imagenPrincipalUrl = uploadedMain.secure_url;
      } catch (error) {
        console.error('Error subiendo imagen principal a Cloudinary:', error);
        throw new BadRequestException('Error al subir la imagen principal');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newSport = queryRunner.manager.create(SportEntity, {
        ...sportData,
        imagen_principal: imagenPrincipalUrl,
      });

      const savedSport = await queryRunner.manager.save(SportEntity, newSport);

      if (gallery_files && gallery_files.length > 0) {
        const newImageEntities: SportImageEntity[] = [];
        for (const file of gallery_files) {
          try {
            const uploaded = await this.cloudinaryService.uploadFile(file);
            newImageEntities.push(
              queryRunner.manager.create(SportImageEntity, {
                url: uploaded.secure_url,
                sport: savedSport,
              }),
            );
          } catch (error) {
            console.error(
              'Error subiendo imagen de galería a Cloudinary:',
              error,
            );
            throw new BadRequestException(
              'Error al subir las imágenes de la galería',
            );
          }
        }

        if (newImageEntities.length > 0) {
          await queryRunner.manager.save(SportImageEntity, newImageEntities);
        }
      }

      if (pistas && Array.isArray(pistas) && pistas.length > 0) {
        for (const pistaDto of pistas) {
          const isActive =
            pistaDto.is_active === undefined
              ? true
              : pistaDto.is_active === true ||
                pistaDto.is_active === 1 ||
                pistaDto.is_active === 'true';

          const newCourt = queryRunner.manager.create(CourtEntity, {
            nombre: pistaDto.nombre,
            precio_hora: Number(pistaDto.precio_hora),
            is_active: isActive,
            servicio: savedSport,
          });
          await queryRunner.manager.save(CourtEntity, newCourt);
        }
      }

      if (horarios && Array.isArray(horarios) && horarios.length > 0) {
        const scheduleEntities = horarios.map((item) => {
          return queryRunner.manager.create(SportsScheduleEntity, {
            dia_semana: Number(item.dia_semana),
            hora_inicio: item.hora_inicio,
            hora_termino: item.hora_termino,
            is_active:
              item.bloque_activo === 1 ||
              item.bloque_activo === true ||
              item.bloque_activo === '1',
            servicio: savedSport,
          });
        });

        await queryRunner.manager.save(SportsScheduleEntity, scheduleEntities);
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return {
        msg: 'Servicio creado correctamente',
        sport: await this.findOne(savedSport.id_deporte),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }

  /**
   * Obtiene el listado paginado de todos los servicios deportivos para el panel de administración.
   *
   * @param paginationDto Parámetros de límite y desplazamiento de la consulta.
   * @returns Objeto con el arreglo de servicios deportivos registrados.
   */
  async findAllAdmin(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const sports = await this.sportRepository.find({
      take: limit,
      skip: offset,
      select: {
        id_deporte: true,
        nombre: true,
        imagen_principal: true,
        descripcion: true,
        is_active: true,
      },
    });

    return { data: { servicios: sports } };
  }

  /**
   * Obtiene los deportes activos junto con sus canchas activas y precios para selectores de reserva.
   *
   * @returns Objeto con el indicador de éxito y el listado resumido de servicios y pistas.
   */
  async findSportsNames() {
    const sports = await this.sportRepository
      .createQueryBuilder('s')
      .select([
        's.id_deporte',
        's.nombre',
        's.imagen_principal',
        'p.id_pista',
        'p.nombre',
        'p.precio_hora',
      ])
      .leftJoin('s.pistas', 'p', 'p.is_active = :isActive', { isActive: true })
      .where('s.is_active = :isActive', { isActive: true })
      .orderBy('s.id_deporte', 'ASC')
      .addOrderBy('p.id_pista', 'ASC')
      .getMany();

    const servicios = sports.map((sport: any) => ({
      id_servicio: sport.id_servicio ?? sport.id_deporte,
      nombre: sport.nombre,
      imagen_principal: sport.imagen_principal,
      pistas: sport.pistas || [],
    }));

    return {
      ok: true,
      servicios,
    };
  }

  /**
   * Lista de forma paginada los datos principales de los servicios deportivos.
   *
   * @param paginationDto Parámetros de paginación (`limit` y `offset`).
   * @returns Objeto que contiene el listado de servicios deportivos.
   */
  async findAll(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const sports = await this.sportRepository.find({
      take: limit,
      skip: offset,
      select: {
        id_deporte: true,
        nombre: true,
        imagen_principal: true,
        descripcion: true,
        is_active: true,
      },
    });

    return { data: { servicios: sports } };
  }

  /**
   * Obtiene los servicios deportivos activos con su precio mínimo y promedio de reseñas para el inicio.
   *
   * @returns Objeto con el catálogo enriquecido de servicios deportivos para la página principal.
   */
  async findHomePage() {
    const [sports, ratingsRaw] = await Promise.all([
      this.sportRepository.find({
        where: { is_active: true },
        relations: { pistas: true },
      }),
      this.commentRepository
        .createQueryBuilder('c')
        .select('c.id_deporte', 'id_deporte')
        .addSelect('ROUND(AVG(c.calificacion)::numeric, 1)', 'promedio')
        .addSelect('COUNT(c.id_comentario)', 'total')
        .where('c.is_active = :isActive', { isActive: true })
        .groupBy('c.id_deporte')
        .getRawMany<{
          id_deporte: string;
          promedio: string;
          total: string;
        }>(),
    ]);

    const ratingsMap = new Map(
      ratingsRaw.map((r) => [
        r.id_deporte,
        {
          calificacion: Number(r.promedio),
          total_comentarios: Number(r.total),
        },
      ]),
    );

    const servicios = sports.map((sport) => {
      const activePistas = (sport.pistas ?? [])
        .filter((p) => p.is_active)
        .sort((a, b) => a.id_pista - b.id_pista);

      const precioDesde =
        activePistas.length > 0
          ? Math.min(...activePistas.map((p) => Number(p.precio_hora)))
          : null;

      const ratingInfo = ratingsMap.get(sport.id_deporte);

      return {
        id_deporte: sport.id_deporte,
        nombre: sport.nombre,
        descripcion: sport.descripcion,
        imagen_principal: sport.imagen_principal,
        precio_desde: precioDesde,
        calificacion: ratingInfo ? ratingInfo.calificacion : null,
        total_comentarios: ratingInfo ? ratingInfo.total_comentarios : 0,
        pistas: activePistas.map((p) => ({
          id_pista: p.id_pista,
          nombre: p.nombre,
          precio_hora: p.precio_hora,
          is_active: p.is_active,
        })),
      };
    });

    return { data: { servicios } };
  }

  /**
   * Busca un servicio deportivo por su UUID o nombre e incluye sus canchas, horarios e imágenes ordenados.
   *
   * @param term Identificador UUID v4 o nombre del deporte a consultar.
   * @returns Entidad completa del servicio deportivo encontrado.
   */
  async findOne(term: string) {
    const queryBuilder = this.sportRepository
      .createQueryBuilder('sport')
      .leftJoinAndSelect('sport.pistas', 'pista')
      .leftJoinAndSelect('sport.horarios', 'horario')
      .leftJoinAndSelect('sport.imagenes', 'sportImages');

    if (isUUID(term)) {
      queryBuilder.where('sport.id_deporte = :id', { id: term });
    } else {
      queryBuilder.where('UPPER(sport.nombre) = :nombre', {
        nombre: term.toUpperCase(),
      });
    }

    const sport = await queryBuilder.getOne();

    if (!sport) {
      throw new NotFoundException(`Sport with term "${term}" not found`);
    }

    if (sport.horarios?.length) {
      sport.horarios.sort((a, b) => {
        const diaA = a.dia_semana === 0 ? 7 : a.dia_semana;
        const diaB = b.dia_semana === 0 ? 7 : b.dia_semana;

        if (diaA !== diaB) return diaA - diaB;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
    }

    if (sport.pistas?.length) {
      sport.pistas.sort((a, b) => a.id_pista - b.id_pista);
    }

    return sport;
  }

  /**
   * Obtiene el detalle de un deporte transformando su galería de imágenes en un arreglo plano de URLs.
   *
   * @param term Identificador UUID v4 o nombre del deporte a consultar.
   * @returns Objeto del deporte con la propiedad `imagenes` como arreglo de cadenas URL.
   */
  async findOnePlain(term: string) {
    const { imagenes = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      imagenes: imagenes?.map((image) => image.url),
    };
  }

  /**
   * Convierte de forma segura un campo recibido como cadena JSON o valor directo al tipo esperado.
   *
   * @param field Valor original del campo (cadena JSON, arreglo u objeto).
   * @param fieldName Nombre descriptivo del campo para reportar errores de formato.
   * @returns Valor parseado al tipo genérico `T` o `undefined` si está vacío.
   */
  private parseJsonField<T>(field: any, fieldName: string): T | undefined {
    if (field === undefined || field === null || field === '') return undefined;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (error) {
        console.error(`Error al parsear el JSON de [${fieldName}]:`, field);
        throw new BadRequestException(
          `El formato del campo ${fieldName} no es un JSON válido.`,
        );
      }
    }
    return field;
  }

  private validateCourtsAndSchedules(
    pistas?: any[],
    horarios?: any[],
  ): void {
    if (pistas !== undefined) {
      if (!Array.isArray(pistas)) {
        throw new BadRequestException('El campo pistas debe ser un arreglo');
      }
      for (const p of pistas) {
        if (
          !p ||
          typeof p.nombre !== 'string' ||
          p.nombre.trim().length < 1 ||
          p.nombre.trim().length > 100
        ) {
          throw new BadRequestException(
            'Cada cancha debe tener un nombre válido',
          );
        }
        const precio = Number(p.precio_hora);
        if (!Number.isFinite(precio) || precio < 0) {
          throw new BadRequestException(
            'El precio por hora de cada cancha debe ser un número mayor o igual a 0',
          );
        }
      }
    }

    if (horarios !== undefined) {
      if (!Array.isArray(horarios)) {
        throw new BadRequestException('El campo horarios debe ser un arreglo');
      }
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      for (const h of horarios) {
        const dia = Number(h?.dia_semana);
        if (!Number.isInteger(dia) || dia < 0 || dia > 7) {
          throw new BadRequestException(
            'El día de la semana en horarios debe estar entre 0 y 7',
          );
        }
        if (
          typeof h?.hora_inicio !== 'string' ||
          typeof h?.hora_termino !== 'string' ||
          !timeRegex.test(h.hora_inicio) ||
          !timeRegex.test(h.hora_termino)
        ) {
          throw new BadRequestException(
            'Las horas de inicio y término deben tener formato HH:mm o HH:mm:ss',
          );
        }
      }
    }
  }

  /**
   * Actualiza transaccionalmente un servicio deportivo, su portada, galería, canchas y horarios.
   *
   * @param id Identificador UUID del servicio deportivo a actualizar.
   * @param updateData Datos de actualización junto con archivos multimedia y listas sincronizadas.
   * @returns Mensaje de éxito y la entidad actualizada del servicio deportivo.
   */
  async update(id: string, updateData: any) {
    const {
      horarios: rawHorarios,
      pistas: rawPistas,
      imagenes_existentes: rawImagenesExistentes,
      imagenes_eliminadas: rawImagenesEliminadas,
      imagen_principal: imagen_principal_file,
      imagen_principal_url,
      gallery_files,
      ...toUpdate
    } = updateData;

    const horarios = this.parseJsonField<any[]>(rawHorarios, 'horarios');
    const pistas = this.parseJsonField<any[]>(rawPistas, 'pistas');
    this.validateCourtsAndSchedules(pistas, horarios);
    const imagenes_existentes = this.parseJsonField<string[]>(
      rawImagenesExistentes,
      'imagenes_existentes',
    );
    const imagenes_eliminadas = this.parseJsonField<string[]>(
      rawImagenesEliminadas,
      'imagenes_eliminadas',
    );

    if (toUpdate.is_active !== undefined) {
      toUpdate.is_active =
        toUpdate.is_active === true ||
        toUpdate.is_active === 'true' ||
        toUpdate.is_active === 1 ||
        toUpdate.is_active === '1';
    }

    const sport = await this.sportRepository.preload({
      id_deporte: id,
      ...toUpdate,
    });

    if (!sport) {
      throw new NotFoundException(`Sport con id ${id} no encontrado`);
    }

    if (imagen_principal_file) {
      try {
        const uploadedMain = await this.cloudinaryService.uploadFile(
          imagen_principal_file,
        );
        sport.imagen_principal = uploadedMain.secure_url;
      } catch (error) {
        console.error('Error subiendo imagen principal a Cloudinary:', error);
        throw new BadRequestException('Error al subir la imagen principal');
      }
    } else if (imagen_principal_url !== undefined) {
      sport.imagen_principal = imagen_principal_url;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(sport);

      if (
        imagenes_existentes !== undefined ||
        imagenes_eliminadas !== undefined ||
        (gallery_files && gallery_files.length > 0)
      ) {
        if (imagenes_existentes !== undefined) {
          if (imagenes_existentes.length > 0) {
            await queryRunner.manager.delete(SportImageEntity, {
              sport: { id_deporte: id },
              url: Not(In(imagenes_existentes)),
            });
          } else {
            await queryRunner.manager.delete(SportImageEntity, {
              sport: { id_deporte: id },
            });
          }
        } else if (imagenes_eliminadas && imagenes_eliminadas.length > 0) {
          await queryRunner.manager.delete(SportImageEntity, {
            sport: { id_deporte: id },
            url: In(imagenes_eliminadas),
          });
        }

        const newImageEntities: SportImageEntity[] = [];
        if (gallery_files && gallery_files.length > 0) {
          for (const file of gallery_files) {
            try {
              const uploaded = await this.cloudinaryService.uploadFile(file);
              newImageEntities.push(
                queryRunner.manager.create(SportImageEntity, {
                  url: uploaded.secure_url,
                  sport: sport,
                }),
              );
            } catch (error) {
              console.error(
                'Error subiendo imagen de galería a Cloudinary:',
                error,
              );
              throw new BadRequestException(
                'Error al subir las imágenes de la galería',
              );
            }
          }
        }

        if (newImageEntities.length > 0) {
          await queryRunner.manager.save(SportImageEntity, newImageEntities);
        }
      }

      if (pistas && Array.isArray(pistas)) {
        const existingCourts = await queryRunner.manager.find(CourtEntity, {
          where: { servicio: { id_deporte: id } },
        });

        const incomingCourtIds = pistas
          .filter((p) => p.id_pista !== undefined && p.id_pista !== null)
          .map((p) => Number(p.id_pista));

        const courtsToDelete = existingCourts.filter(
          (c) => !incomingCourtIds.includes(Number(c.id_pista)),
        );
        if (courtsToDelete.length > 0) {
          await queryRunner.manager.remove(CourtEntity, courtsToDelete);
        }

        for (const pistaDto of pistas) {
          const isActive =
            pistaDto.is_active === undefined
              ? true
              : pistaDto.is_active === true ||
                pistaDto.is_active === 1 ||
                pistaDto.is_active === 'true';

          if (pistaDto.id_pista) {
            const belongsToSport = existingCourts.some(
              (c) => Number(c.id_pista) === Number(pistaDto.id_pista),
            );
            if (!belongsToSport) {
              throw new BadRequestException(
                `La cancha #${pistaDto.id_pista} no pertenece a este servicio deportivo`,
              );
            }

            await queryRunner.manager.update(
              CourtEntity,
              {
                id_pista: Number(pistaDto.id_pista),
                servicio: { id_deporte: id },
              },
              {
                nombre: String(pistaDto.nombre).trim(),
                precio_hora: Number(pistaDto.precio_hora),
                is_active: isActive,
              },
            );
          } else {
            const newCourt = queryRunner.manager.create(CourtEntity, {
              nombre: String(pistaDto.nombre).trim(),
              precio_hora: Number(pistaDto.precio_hora),
              is_active: isActive,
              servicio: sport,
            });
            await queryRunner.manager.save(CourtEntity, newCourt);
          }
        }
      }

      if (horarios && Array.isArray(horarios)) {
        await queryRunner.manager.delete(SportsScheduleEntity, {
          servicio: { id_deporte: id },
        });

        const scheduleEntities = horarios.map((item) => {
          return queryRunner.manager.create(SportsScheduleEntity, {
            dia_semana: Number(item.dia_semana),
            hora_inicio: item.hora_inicio,
            hora_termino: item.hora_termino,
            is_active:
              item.bloque_activo === 1 ||
              item.bloque_activo === true ||
              item.bloque_activo === '1',
            servicio: sport,
          });
        });

        if (scheduleEntities.length > 0) {
          await queryRunner.manager.save(
            SportsScheduleEntity,
            scheduleEntities,
          );
        }
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return {
        msg: 'Servicio actualizado correctamente',
        sport: await this.findOne(id),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }

  /**
   * Elimina un servicio deportivo de la base de datos previa verificación de su existencia.
   *
   * @param id Identificador UUID del servicio deportivo a eliminar.
   * @returns Promesa resuelta al completarse la eliminación.
   */
  async remove(id: string) {
    const sport = await this.findOne(id);
    await this.sportRepository.remove(sport);
  }

  /**
   * Centraliza el manejo de errores de base de datos al operar sobre servicios deportivos.
   *
   * @param error Error capturado durante la operación en la base de datos.
   * @returns Lanza una excepción HTTP correspondiente al error detectado.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);

    throw new InternalServerErrorException('Error creating sport');
  }

  /**
   * Elimina todos los horarios y servicios deportivos registrados en una transacción (usado en el seed).
   *
   * @returns Objeto con el resultado de eliminación de horarios y deportes.
   */
  async deleteAllSports() {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const schedules = await manager
          .createQueryBuilder()
          .delete()
          .from(SportsScheduleEntity)
          .execute();

        const sports = await manager
          .createQueryBuilder()
          .delete()
          .from(SportEntity)
          .execute();

        return { schedules, sports };
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
