import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';



/**
 * Inyecta el usuario autenticado o una de sus propiedades en un parámetro del controlador.
 *
 * @param data Nombre opcional de la propiedad del usuario que se desea obtener.
 * @returns Un decorador de parámetro que proporciona el usuario o la propiedad solicitada.
 */
export const GetUser = createParamDecorator(
    ( data: string, ctx: ExecutionContext ) => {

        const req = ctx.switchToHttp().getRequest();
        const user = req.user;

        if ( !user )
            throw new InternalServerErrorException('User not found (request)');
        
        return ( !data ) 
            ? user 
            : user[data];
        
    }
);
