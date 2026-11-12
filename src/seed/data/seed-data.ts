import * as bcrypt from 'bcrypt';

interface SeedUser {
  email: string;
  nombre: string;
  apellido: string;
  password: string;
  telefono: string;
  roles: string[];
}

export interface SeedSport {
  nombre: string;
  descripcion: string;
  imagen_principal: string;
  imagenes: string[];
  pistas: SeedPista[];
}

export interface SeedPista {
  nombre: string;
  precio_hora: number;
  is_active: boolean;
}

export interface SeedBooking {
  id_pista: number;
  user_index?: number;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  precio_cobrado: number;
  estado: string;
  comentario: string | null;
  pago: {
    monto: number;
    metodo_pago: string;
    estado_pago: string;
    token_transaccion: string;
  };
  detalle_comentario?: {
    calificacion: number;
    comentario: string;
    is_active: boolean;
  };
}

export interface SeedData {
  users: SeedUser[];
  pistas?: SeedPista[];
  sports: SeedSport[];
  bookings: SeedBooking[];
}

export const initialData: SeedData = {
  users: [
    {
      email: 'm.jcatalan.rojas@gmail.com',
      telefono: '+56975208137',
      password: bcrypt.hashSync('Admin123.', 10),
      nombre: 'Maria Jose',
      apellido: 'Catalan Rojas',
      roles: ['admin'],
    },
    {
      email: 'nicolas.esponda@estudiante.ugm.com',
      telefono: '+56985785334',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Nicolás',
      apellido: 'Esponda',
      roles: ['user'],
    },
    {
      email: 'camila.rojas@estudiante.ugm.com',
      telefono: '+56912345678',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Camila',
      apellido: 'Rojas',
      roles: ['user'],
    },
    {
      email: 'matias.silva@estudiante.ugm.com',
      telefono: '+56923456789',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Matías',
      apellido: 'Silva',
      roles: ['user'],
    },
    {
      email: 'valentina.soto@estudiante.ugm.com',
      telefono: '+56934567890',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Valentina',
      apellido: 'Soto',
      roles: ['user'],
    },
    {
      email: 'sebastian.tapia@estudiante.ugm.com',
      telefono: '+56945678901',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Sebastián',
      apellido: 'Tapia',
      roles: ['user'],
    },
    {
      email: 'catalina.munoz@estudiante.ugm.com',
      telefono: '+56956789012',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Catalina',
      apellido: 'Muñoz',
      roles: ['user'],
    },
    {
      email: 'felipe.gonzalez@estudiante.ugm.com',
      telefono: '+56967890123',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Felipe',
      apellido: 'González',
      roles: ['user'],
    },
    {
      email: 'javiera.perez@estudiante.ugm.com',
      telefono: '+56978901234',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Javiera',
      apellido: 'Pérez',
      roles: ['user'],
    },
    {
      email: 'diego.castro@estudiante.ugm.com',
      telefono: '+56989012345',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Diego',
      apellido: 'Castro',
      roles: ['user'],
    },
    {
      email: 'antonia.morales@estudiante.ugm.com',
      telefono: '+56990123456',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Antonia',
      apellido: 'Morales',
      roles: ['user'],
    },
    {
      email: 'benjamin.diaz@estudiante.ugm.com',
      telefono: '+56911223344',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Benjamín',
      apellido: 'Díaz',
      roles: ['user'],
    },
    {
      email: 'sofia.herrera@estudiante.ugm.com',
      telefono: '+56922334455',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Sofía',
      apellido: 'Herrera',
      roles: ['user'],
    },
    {
      email: 'joaquin.vargas@estudiante.ugm.com',
      telefono: '+56933445566',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Joaquín',
      apellido: 'Vargas',
      roles: ['user'],
    },
    {
      email: 'isidora.fuentes@estudiante.ugm.com',
      telefono: '+56944556677',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Isidora',
      apellido: 'Fuentes',
      roles: ['user'],
    },
    {
      email: 'tomas.sepulveda@estudiante.ugm.com',
      telefono: '+56955667788',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Tomás',
      apellido: 'Sepúlveda',
      roles: ['user'],
    },
    {
      email: 'florencia.torres@estudiante.ugm.com',
      telefono: '+56966778899',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Florencia',
      apellido: 'Torres',
      roles: ['user'],
    },
    {
      email: 'martin.flores@estudiante.ugm.com',
      telefono: '+56977889900',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Martín',
      apellido: 'Flores',
      roles: ['user'],
    },
    {
      email: 'ignacia.gomez@estudiante.ugm.com',
      telefono: '+56988990011',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Ignacia',
      apellido: 'Gómez',
      roles: ['user'],
    },
    {
      email: 'lucas.valdes@estudiante.ugm.com',
      telefono: '+56999001122',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Lucas',
      apellido: 'Valdés',
      roles: ['user'],
    },
    {
      email: 'martina.araya@estudiante.ugm.com',
      telefono: '+56910293847',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Martina',
      apellido: 'Araya',
      roles: ['user'],
    },
    {
      email: 'vicente.carrasco@estudiante.ugm.com',
      telefono: '+56956473829',
      password: bcrypt.hashSync('Abc123.', 10),
      nombre: 'Vicente',
      apellido: 'Carrasco',
      roles: ['user'],
    },
  ],

  sports: [
    {
      nombre: 'Tenis',
      descripcion:
        'Juega en nuestras canchas de arcilla profesionales con superficie de alta calidad, que reduce el impacto y garantiza un bote consistente. Ideales para entrenamientos y partidos de dobles. Disponemos de iluminación de primera para jugar de noche.',
      imagen_principal:
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671371/KINETIC-RESERVATIONS/servicios/zjfxkopmsbfbvxda7xmj.jpg',
      imagenes: [
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671371/KINETIC-RESERVATIONS/servicios/zjfxkopmsbfbvxda7xmj.jpg',
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671371/KINETIC-RESERVATIONS/servicios/vviasfx75s8gtn1pxbvg.jpg',
      ],
      pistas: [
        { nombre: 'Cancha 1 - Arcilla', precio_hora: 15000, is_active: true },
        { nombre: 'Cancha 2 - Rápida', precio_hora: 12000, is_active: true },
      ],
    },
    {
      nombre: 'Fútbol 7',
      descripcion:
        'Disfruta de un césped impecable, ideal para un juego rápido y seguro. Nuestras instalaciones son perfectas para ligas y grandes torneos. Incluyen arcos y potente iluminación nocturna. ¡Reúne a tu equipo y experimenta la máxima pasión del fútbol!',
      imagen_principal:
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671369/KINETIC-RESERVATIONS/servicios/vy2b3irwwgcdi552ifpc.jpg',
      imagenes: [
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671369/KINETIC-RESERVATIONS/servicios/vy2b3irwwgcdi552ifpc.jpg',
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671371/KINETIC-RESERVATIONS/servicios/vviasfx75s8gtn1pxbvg.jpg',
      ],
      pistas: [
        { nombre: 'Cancha 1', precio_hora: 15000, is_active: true },
        { nombre: 'Cancha 2', precio_hora: 12000, is_active: true },
      ],
    },
    {
      nombre: 'Hockey',
      descripcion:
        'Pista especializada para Hockey sobre Cemento (patín o roller). Superficie lisa y resistente optimizada para la velocidad y la precisión en el manejo del stick. Perfecta para entrenamientos intensivos y partidos dinámicos.',
      imagen_principal:
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671369/KINETIC-RESERVATIONS/servicios/xyql1m3n6rve6mrub9rw.jpg',
      imagenes: [
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671369/KINETIC-RESERVATIONS/servicios/xyql1m3n6rve6mrub9rw.jpg',
        'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792671370/KINETIC-RESERVATIONS/servicios/cigltqpyuoxorgt4vqou.jpg',
      ],
      pistas: [{ nombre: 'Cancha 1', precio_hora: 15000, is_active: true }],
    },
  ],
  bookings: [
    {
      // Reserva 1 (Usuario 1: Nicolás Esponda) -> Pista 2 (Tenis) | Calificación: 5 estrellas
      user_index: 0,
      id_pista: 2,
      fecha: '2026-10-27',
      hora_inicio: '09:00:00',
      hora_termino: '10:00:00',
      precio_cobrado: 12000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 12000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab227ca43a7050dac3b2622981b9f07eb90be9d1b55d4198842cd4f6e577ae',
      },
      detalle_comentario: {
        calificacion: 5,
        comentario:
          'Excelente cancha de tenis, la superficie rápida está en impecables condiciones y la iluminación permite jugar sin ningún problema. Totalmente recomendada.',
        is_active: true,
      },
    },
    {
      // Reserva 2 (Usuario 1: Nicolás Esponda) -> Pista 1 (Tenis Arcilla) | Sin comentario
      user_index: 0,
      id_pista: 1,
      fecha: '2026-10-29',
      hora_inicio: '11:00:00',
      hora_termino: '12:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab227ca43a7050dac3b2622981b9f07eb90be9d1b55d4198842cd4f6e577af',
      },
    },
    {
      // Reserva 3 (Usuario 2: Camila Rojas) -> Pista 3 (Fútbol 7) | Calificación: 3 estrellas
      user_index: 1,
      id_pista: 3,
      fecha: '2026-10-27',
      hora_inicio: '10:00:00',
      hora_termino: '11:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab338db54b8161ebd4c3733092c0a18fc01cf0e2c66e5209953de5a7f688bf',
      },
      detalle_comentario: {
        calificacion: 3,
        comentario:
          'La cancha de fútbol cumple para jugar un partido con amigos, pero al pasto sintético le falta algo de caucho en las áreas y tardaron un poco en entregarnos el turno.',
        is_active: true,
      },
    },
    {
      // Reserva 4 (Usuario 2: Camila Rojas) -> Pista 4 (Fútbol 7 Cancha 2) | Sin comentario
      user_index: 1,
      id_pista: 4,
      fecha: '2026-10-30',
      hora_inicio: '16:00:00',
      hora_termino: '17:00:00',
      precio_cobrado: 12000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 12000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab338db54b8161ebd4c3733092c0a18fc01cf0e2c66e5209953de5a7f688c0',
      },
    },
    {
      // Reserva 5 (Usuario 3: Matías Silva) -> Pista 5 (Hockey) | Calificación: 1 estrella
      user_index: 2,
      id_pista: 5,
      fecha: '2026-10-27',
      hora_inicio: '11:00:00',
      hora_termino: '12:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab449ec65c9272fce5d4844103d1b29ad12da1f3d77f6310064ef6b8a799ca',
      },
      detalle_comentario: {
        calificacion: 1,
        comentario:
          'Muy mala experiencia en la pista de hockey. El piso estaba resbaladizo y sucio al llegar, lo que es peligroso para patinar, y nadie de administración nos dio solución.',
        is_active: true,
      },
    },
    {
      // Reserva 6 (Usuario 3: Matías Silva) -> Pista 1 (Tenis Arcilla) | Sin comentario
      user_index: 2,
      id_pista: 1,
      fecha: '2026-10-31',
      hora_inicio: '15:00:00',
      hora_termino: '16:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab449ec65c9272fce5d4844103d1b29ad12da1f3d77f6310064ef6b8a799cb',
      },
    },
    {
      // Reserva 7 (Usuario 4: Valentina Soto) -> Pista 1 (Tenis Arcilla) | Calificación: 4 estrellas
      user_index: 3,
      id_pista: 1,
      fecha: '2026-10-28',
      hora_inicio: '09:00:00',
      hora_termino: '10:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab550fd76da3830df6e5955214e2c30be23eb204e8807421175fa7c9b8aa01',
      },
      detalle_comentario: {
        calificacion: 4,
        comentario:
          'Muy buena cancha de arcilla, la red y las líneas estaban bien delimitadas. Solo mejoraría la disponibilidad de camarines.',
        is_active: true,
      },
    },
    {
      // Reserva 8 (Usuario 4: Valentina Soto) -> Pista 2 (Tenis Rápida) | Sin comentario
      user_index: 3,
      id_pista: 2,
      fecha: '2026-10-30',
      hora_inicio: '10:00:00',
      hora_termino: '11:00:00',
      precio_cobrado: 12000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 12000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab550fd76da3830df6e5955214e2c30be23eb204e8807421175fa7c9b8aa02',
      },
    },
    {
      // Reserva 9 (Usuario 5: Sebastián Tapia) -> Pista 3 (Fútbol 7) | Calificación: 5 estrellas
      user_index: 4,
      id_pista: 3,
      fecha: '2026-10-28',
      hora_inicio: '18:00:00',
      hora_termino: '19:00:00',
      precio_cobrado: 15000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 15000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab661ae87eb4941ea7f6a66325f3d41cf34fc315f99185322860b8da09bb01',
      },
      detalle_comentario: {
        calificacion: 5,
        comentario:
          'Instalaciones de primer nivel. Jugamos un partido nocturno y los focos iluminan toda la cancha perfectamente. Volveremos cada semana.',
        is_active: true,
      },
    },
    {
      // Reserva 10 (Usuario 5: Sebastián Tapia) -> Pista 4 (Fútbol 7 Cancha 2) | Sin comentario
      user_index: 4,
      id_pista: 4,
      fecha: '2026-10-31',
      hora_inicio: '19:00:00',
      hora_termino: '20:00:00',
      precio_cobrado: 12000,
      estado: 'Pagada',
      comentario: null,
      pago: {
        monto: 12000,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion:
          '01ab661ae87eb4941ea7f6a66325f3d41cf34fc315f99185322860b8da09bb02',
      },
    },
  ],
};
