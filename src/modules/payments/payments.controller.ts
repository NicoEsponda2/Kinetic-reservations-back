import {
  All,
  Body,
  Controller,
  Post,
  Query,
  Redirect,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payments.service.js';
import { CommitPaymentDto, InitPaymentDto } from './dto/create-payment.dto.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { GetUser } from '../../auth/decorators/get-user.decorator.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  PaymentCommitResponseDto,
  PaymentStartResponseDto,
} from '../../common/swagger/api-response.dto.js';

@ApiTags('Pagos')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Inicia una transacción de pago con Webpay Plus para la aplicación web.
   *
   * @param initPaymentDto Datos iniciales de la reserva, usuario, rol y monto a cobrar.
   * @returns Objeto con la URL del formulario Webpay y el token de la transacción.
   */
  @Post('initiate-payment')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Iniciar transacción Webpay Plus para la web',
    description:
      'Crea una transacción validando el precio real de la cancha y devuelve URL y token para redirigir al usuario.',
  })
  @ApiCreatedResponse({ type: PaymentStartResponseDto })
  @ApiBadRequestResponse({ description: 'Datos de pago inválidos o cancha ocupada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  iniciarPago(
    @Body() initPaymentDto: InitPaymentDto,
    @GetUser() user: UserEntity,
  ) {
    return this.paymentService.iniciarPago(initPaymentDto, user);
  }

  /**
   * Recibe el retorno de Transbank tras el proceso de pago web y redirige al frontend Angular.
   *
   * @param body Cuerpo de la petición enviado por Transbank con los tokens de estado.
   * @param query Parámetros de consulta con los tokens o el rol del usuario.
   * @returns Objeto con la URL de destino para ejecutar la redirección HTTP 302.
   */
  @All('return')
  @Redirect()
  @ApiOperation({
    summary: 'Recibir retorno de Transbank y redirigir a la aplicación web',
    description:
      'Acepta varios métodos HTTP. Lee token_ws o TBK_TOKEN desde el cuerpo o los parámetros de consulta y responde con una redirección HTTP.',
  })
  @ApiQuery({
    name: 'token_ws',
    required: false,
    description: 'Token de transacción exitosa.',
  })
  @ApiQuery({
    name: 'TBK_TOKEN',
    required: false,
    description: 'Token de anulación.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Rol usado para seleccionar la URL de retorno.',
  })
  @ApiResponse({ status: 302, description: 'Redirección a la aplicación web.' })
  retornoTransbank(@Body() body: any, @Query() query: any) {
    const token_ws = body?.token_ws || query?.token_ws;
    const TBK_TOKEN = body?.TBK_TOKEN || query?.TBK_TOKEN;
    const role = query?.role;

    return this.paymentService.resolverRedireccionRetorno({
      token_ws,
      TBK_TOKEN,
      role,
    });
  }

  /**
   * Confirma la transacción en Transbank y registra la reserva junto con su pago en la base de datos.
   *
   * @param commitPaymentDto Token de Webpay y detalles de la reserva que se desea confirmar.
   * @returns Información del pago confirmado y el identificador de la reserva creada.
   */
  @Post('commit')
  @Auth(ValidRoles.user, ValidRoles.admin, ValidRoles.superUser)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Confirmar pago y registrar reserva',
    description:
      'Confirma el token con Transbank, valida precio y disponibilidad, y guarda reserva y pago en una transacción de base de datos.',
  })
  @ApiCreatedResponse({ type: PaymentCommitResponseDto })
  @ApiBadRequestResponse({
    description: 'Pago no autorizado, monto inválido o horario ocupado.',
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  commitPago(
    @Body() commitPaymentDto: CommitPaymentDto,
    @GetUser() user: UserEntity,
  ) {
    return this.paymentService.commitPago(commitPaymentDto, user);
  }

  /**
   * Inicia una transacción de pago con Webpay Plus adaptada para el flujo de la aplicación móvil.
   *
   * @param initPaymentDto Datos de la reserva, usuario y monto a pagar.
   * @param request Objeto de la petición HTTP para construir dinámicamente la URL de retorno.
   * @returns Objeto con la URL de Webpay, el token y la URL de callback para el WebView móvil.
   */
  @Post('initiate-mobile-payment')
  @ApiOperation({
    summary: 'Iniciar transacción Webpay para móvil',
    description:
      'Recibe id_reserva, id_usuario y monto. Devuelve además la URL de retorno que la aplicación debe interceptar dentro de la vista web integrada (WebView).',
  })
  @ApiBody({ type: InitPaymentDto })
  @ApiCreatedResponse({ type: PaymentStartResponseDto })
  @ApiBadRequestResponse({ description: 'Datos de pago inválidos.' })
  iniciarPagoMovil(
    @Body() initPaymentDto: InitPaymentDto,
    @Req() request: Request,
  ) {
    const host = request.get('host');
    const requestReturnUrl = host
      ? `${request.protocol}://${host}/api/payment/mobile-app-return`
      : undefined;

    return this.paymentService.iniciarPagoMovil(
      initPaymentDto,
      requestReturnUrl,
    );
  }

  /**
   * Procesa el retorno de Transbank en el flujo móvil y redirige a la URL interceptada por la app.
   *
   * @param body Cuerpo de la respuesta de Transbank con tokens de transacción o anulación.
   * @param query Parámetros de consulta enviados en el retorno de Transbank.
   * @returns Objeto con la URL de callback móvil que incluye los parámetros del resultado.
   */
  @All('mobile-app-return')
  @Redirect()
  @ApiOperation({
    summary: 'Recibir retorno de Transbank para la aplicación móvil',
    description:
      'Recibe token_ws o TBK_TOKEN mediante el cuerpo o los parámetros de consulta y redirige al marcador que intercepta la vista web integrada (WebView) de la aplicación móvil.',
  })
  @ApiResponse({ status: 302, description: 'Redirección a la URL de retorno móvil.' })
  retornoAppMovil(@Body() body: any, @Query() query: any) {
    return this.paymentService.resolverRedireccionRetornoMovil({
      token_ws: body?.token_ws || query?.token_ws,
      TBK_TOKEN: body?.TBK_TOKEN || query?.TBK_TOKEN,
    });
  }
}
