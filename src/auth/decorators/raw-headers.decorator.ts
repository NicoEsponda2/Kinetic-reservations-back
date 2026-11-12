import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';



/**
 * Inyecta los encabezados HTTP sin procesar en un parámetro del controlador.
 *
 * @param data Dato opcional del decorador; no modifica los encabezados obtenidos.
 * @returns Un decorador de parámetro que proporciona los encabezados sin procesar.
 */
export const RawHeaders = createParamDecorator(
    ( data: string, ctx: ExecutionContext ) => {

        const req = ctx.switchToHttp().getRequest();
        return req.rawHeaders;
    }
);
