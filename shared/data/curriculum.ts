// ============================================================
// shared/data/curriculum.ts — порядок изучения слов.
//
// Уроки собраны не по частям речи, а по частотности и разговорной
// полезности: сначала местоимения и ser/estar, на 3-м уроке —
// вопросительные слова (сразу можно спрашивать «¿Qué es?»,
// «¿Dónde está?», «¿Cómo estás?»), затем глаголы, семьи, числа,
// время — и дальше тематические блоки по убыванию частотности.
//
// Этот файл — единственный источник порядка уроков: index.ts
// назначает словам lesson по этим спискам и проверяет полноту.
// ============================================================

/** Слова каждого урока, в порядке изучения (индекс + 1 = номер урока) */
export const LESSON_WORDS: string[][] = [
  // 1. Местоимения + ser/estar: кто делает и «быть»
  [
    'p-yo', 'p-tu', 'p-usted', 'p-el', 'p-ella', 'p-nosotros', 'p-ustedes', 'p-ellos', 'p-ellas',
    'v-ser', 'v-estar', 'adv-no',
  ],
  // 2. Артикли и количество
  [
    'd-el', 'd-la', 'd-los', 'd-las', 'd-un', 'd-una', 'd-unos', 'd-unas', 'd-mucho', 'd-poco',
  ],
  // 3. Первые вопросы + оценки: ¿Qué es? ¿Dónde está? — Muy bien
  [
    'qw-que', 'qw-quien', 'qw-donde', 'qw-como', 'qw-cuando', 'qw-por-que',
    'adv-muy', 'adv-tambien', 'adv-bien', 'adv-mal',
  ],
  // 4. Базовые глаголы
  [
    'v-hablar', 'v-comer', 'v-vivir', 'v-trabajar', 'v-estudiar', 'v-aprender', 'v-leer', 'v-escribir',
  ],
  // 5. Слова-связки
  [
    'c-y', 'c-o', 'c-pero', 'c-porque', 'c-que', 'c-si', 'c-cuando', 'c-aunque', 'c-entonces',
  ],
  // 6. Ключевые глаголы
  [
    'v-tener', 'v-hacer', 'v-ir', 'v-poder', 'v-querer', 'v-saber', 'v-ver', 'v-dar',
  ],
  // 7. «Мне нравится» и конструкции: Me gusta..., Hay..., Voy a..., Tengo que...
  [
    'v-gustar', 'p-me', 'p-te', 'p-le', 'p-les', 'p-nos',
    'cstr-hay', 'cstr-hay-que', 'cstr-ir-a', 'cstr-tener-que',
  ],
  // 8. Семья
  [
    'n-padre', 'n-madre', 'n-hijo', 'n-hija', 'n-hermano', 'n-hermana', 'n-familia',
    'n-amigo', 'n-amiga', 'n-nino', 'n-nina',
  ],
  // 9. Притяжательные и указательные: mi hermano, este libro
  [
    'p-mi', 'p-tu-pos', 'p-su', 'p-nuestro', 'p-este', 'p-ese',
  ],
  // 10. Люди и профессии
  [
    'n-hombre', 'n-mujer', 'n-persona', 'n-senor', 'n-maestro', 'n-maestra', 'n-medico', 'n-estudiante',
  ],
  // 11. Время: hoy, mañana, hace dos años
  [
    'n-dia', 'n-noche', 'n-manana', 'n-tarde', 'n-ano', 'n-mes', 'n-semana',
    'n-hora', 'n-minuto', 'n-tiempo', 'n-momento', 'n-vida',
  ],
  // 12. Числа и «сколько»: ¿Cuántos años tienes?
  [
    'num-cero', 'num-uno', 'num-dos', 'num-tres', 'num-cuatro', 'num-cinco', 'num-seis',
    'num-siete', 'num-ocho', 'num-nueve', 'num-diez', 'qw-cuanto', 'qw-cual',
  ],
  // 13. Дом
  [
    'n-casa', 'n-cuarto', 'n-cocina', 'n-mesa', 'n-silla', 'n-puerta', 'n-ventana', 'n-cama', 'n-bano',
  ],
  // 14. Места в городе
  [
    'n-escuela', 'n-trabajo', 'n-ciudad', 'n-calle', 'n-tienda', 'n-restaurante', 'n-mercado',
    'n-parque', 'n-playa', 'n-hotel', 'n-banco', 'n-hospital',
  ],
  // 15. Вещи I
  [
    'n-libro', 'n-telefono', 'n-computadora', 'n-dinero', 'n-llave', 'n-reloj',
    'n-ropa', 'n-camisa', 'n-zapato', 'n-bolsa',
  ],
  // 16. Вещи II
  [
    'n-pelicula', 'n-musica', 'n-cancion', 'n-foto', 'n-regalo', 'n-carta',
    'n-papel', 'n-lapiz', 'n-pluma', 'n-carro',
  ],
  // 17. Прилагательные I: Eres alto
  [
    'a-bueno', 'a-malo', 'a-grande', 'a-pequeno', 'a-nuevo', 'a-viejo', 'a-joven',
    'a-bonito', 'a-feo', 'a-alto', 'a-bajo',
  ],
  // 18. Состояния (с estar)
  [
    'a-cansado', 'a-contento', 'a-triste', 'a-feliz', 'a-enfermo', 'a-ocupado',
    'a-libre', 'a-tranquilo', 'a-caliente', 'a-frio',
  ],
  // 19. Прилагательные II
  [
    'a-facil', 'a-dificil', 'a-importante', 'a-interesante', 'a-rapido', 'a-lento',
    'a-caro', 'a-barato', 'a-limpio', 'a-sucio',
  ],
  // 20. Цвета и вкусы
  [
    'a-blanco', 'a-negro', 'a-rojo', 'a-verde', 'a-azul', 'a-amarillo',
    'a-rico', 'a-pobre', 'a-famoso', 'a-dulce', 'a-delicioso',
  ],
  // 21. Еда и напитки I
  [
    'n-agua', 'n-comida', 'n-pan', 'n-leche', 'n-queso', 'n-huevo', 'n-carne',
    'n-pollo', 'n-pescado', 'n-arroz', 'n-fruta',
  ],
  // 22. Еда и напитки II
  [
    'n-manzana', 'n-platano', 'n-tomate', 'n-cafe', 'n-cerveza', 'n-jugo', 'n-vino', 'n-azucar', 'n-sal',
  ],
  // 23. Предлоги: ¿De dónde eres? Voy a la escuela
  [
    'prep-a', 'prep-de', 'prep-en', 'prep-con', 'prep-para', 'prep-por', 'prep-sin',
    'prep-sobre', 'prep-entre', 'prep-desde', 'prep-hasta',
  ],
  // 24. Предлоги-фразы
  [
    'prep-antes-de', 'prep-despues-de', 'prep-cerca-de', 'prep-lejos-de',
  ],
  // 25. Наречия места и времени
  [
    'adv-aqui', 'adv-alli', 'adv-ahora', 'adv-hoy', 'adv-manana', 'adv-ayer',
    'adv-siempre', 'adv-nunca', 'adv-tampoco',
  ],
  // 26. Наречия II
  [
    'adv-ya', 'adv-todavia', 'adv-casi', 'adv-apenas', 'adv-juntos', 'adv-despacio',
    'adv-rapido', 'adv-temprano', 'adv-tarde', 'adv-mas',
  ],
  // 27. Глаголы II
  [
    'v-beber', 'v-abrir', 'v-cerrar', 'v-empezar', 'v-terminar', 'v-entender',
    'v-recordar', 'v-ayudar', 'v-necesitar', 'v-buscar', 'v-esperar',
  ],
  // 28. Глаголы III
  [
    'v-usar', 'v-llevar', 'v-dejar', 'v-pasar', 'v-creer', 'v-pensar',
    'v-llegar', 'v-salir', 'v-volver', 'v-pagar', 'v-llamar',
  ],
  // 29. Неправильные глаголы
  [
    'v-decir', 'v-venir', 'v-poner', 'v-dormir', 'v-pedir', 'v-seguir', 'v-conocer',
  ],
  // 30. Дополнения и неопределённые: lo veo, algo, nada
  [
    'p-lo', 'p-la', 'p-los', 'p-las', 'p-algo', 'p-nada', 'p-alguien', 'p-nadie', 'p-todo',
  ],
  // 31. Абстрактные понятия
  [
    'n-mundo', 'n-amor', 'n-problema', 'n-pregunta', 'n-respuesta', 'n-palabra', 'n-nombre',
    'n-cosa', 'n-lugar', 'n-parte', 'n-manera', 'n-razon', 'n-verdad', 'n-idea', 'n-historia',
  ],
  // 32. Конструкции II и языки: ¿Hablas español?
  [
    'cstr-acabar-de', 'cstr-hace-tiempo', 'cstr-estar-gerundio',
    'n-espanol', 'n-ruso', 'n-ingles',
  ],
  // 33. Спасательные фразы: попросить и остановить — dame, dime, mira, oye, espera
  [
    'cstr-dame', 'cstr-dime', 'cstr-mira', 'cstr-oye', 'cstr-espera',
  ],
]
