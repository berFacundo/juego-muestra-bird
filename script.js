// URL del modelo de Teachable Machine
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/dJNd3vMnK/";

// Variables globales para el modelo y el número de clases
let model;
let maxPredictions;

// Función inicial para cargar el modelo
async function initModel() {
    // URL del modelo y metadata
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    try {
        // Cargar el modelo y la metadata
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Modelo cargado correctamente:", model);
        console.log("Número de clases:", maxPredictions);
    } catch (error) {
        console.error("Error cargando el modelo:", error);
    }
}

// Llamar a la función para inicializar el modelo
initModel();

//Codigo del juego Flappy Bird

//Variables globales del juego
let boardWidth = 940;           //Ancho del canvas el juego
let boardHeight = 640;          //Alto del canvas del juego

let score = 0;             //Variable del puntaje
let birdImg, topPipeImg, bottomPipeImg, playButtonImg, board, context;      //Variables de imagenes y canvas

let backgroundImg = new Image();    //Definicion del fondo
backgroundImg.src = "./Sprites/flappybirdbg.jpg";    //Ruta de la imagen del fondo

let moneda = new Audio('./Sonidos/Moneda.mp3');         //Definicion de variable del ruido de moneda
let golpe = new Audio('./Sonidos/Golpe.mp3');           //Definicion de variable del ruido de golpe
let muerte = new Audio('./Sonidos/Muerte.mp3');         //Definicion de variable del ruido de muerte

let golpePlayed = false;     // Golpe al comenzar a morir
let muertePlayed = false;    // Ruido mientras cae
let caidaAlta = false;       // Detecta si fue una caida desde alto
let caidaMuerte = false;     // Para no repetir el sonido de muerte

// Pool = conjunto de instancias de audio, sirve para manejar sonidos que se repiten.
// Mejor manejo de sonido de salto: pool para permitir reproducciones sobrepuestas.
// (si el jugador salta repetidamente, se escucha varias veces el ruido, no espera a terminar.)

const saltoPoolSize = 6; // Valor ajustable, maxima cantidad de sonidos simultaneos
const saltoPool = [];    // Array que contiene las instancias de audio
let saltoPoolIndex = 0;  // Indice 
for (let i = 0; i < saltoPoolSize; i++) {
    saltoPool.push(new Audio('./Sonidos/Salto.mp3'));
}

//Funcion que maneja los ruidos al morir
function ruidosMuerte() {
    // Reproducir golpe al iniciar la muerte (solo una vez)
    if (!golpePlayed) {
        golpe.play();
        golpePlayed = true;
    }

    // Si es una caída alta, reproducir muerte mientras cae (pero solo una vez)
    if (caidaAlta && !caidaMuerte) {
        setTimeout(muerte.play.bind(muerte), 300);  // Retraso para que quede con el golpe, 200ms de delay
        caidaMuerte = true;
    }
}

function playSalto() {
    // Toma la siguiente instancia del pool, reinicia y reproduce
    const s = saltoPool[saltoPoolIndex];
    try {
        s.currentTime = 0;
    } catch (err) {
        // Reinicia el array, esta en catch por si no esta cargado el sonido aun.
    }
    // Reproduce y avanza el índice 
    s.play().catch(() => { /* silenciar errores de play() por políticas de autoplay */ });
    saltoPoolIndex = (saltoPoolIndex + 1) % saltoPoolSize;
}


// Imagen y variables del pasto
let grassImg = new Image();
grassImg.src = "./Sprites/flappybirdgrass.png"; // <-- Ruta a imagen de pasto

let grassX = 0;              // Posición X del pasto 
let grassY = boardHeight - 280; // Posición Y del pasto 
let grassSpeed = 6;          // Velocidad de desplazamiento 

let inputLocked = false;        //Variable para bloquear temporalmente el input

document.addEventListener("keydown", handleKeyDown);        //Interaccion con el juego, al presionar una tecla

// Estados del juego
let GAME_STATE = {
    MENU: "menu",
    PLAYING: "playing",
    DYING: "dying",      // Nuevo estado para animación de muerte
    GAME_OVER: "gameOver"
};
let currentState = GAME_STATE.MENU;         //Arranca el juego en el menu

let playButton = {                      //Define el boton para jugar
    x: boardWidth / 2 - 115.5 / 2,          //Coordenada x del boton
    y: boardHeight / 2 - 64 / 2,            //Coordenada y del boton
    width: 115,                 //Ancho del boton
    height: 64                  //Alto del boton
};

let logo = {                       //Define el logo del juego               
    x: boardWidth / 2 - 300 / 2,        //Coordenada x del logo
    y: boardHeight / 4,                 //Coordenada y del logo
    width: 300,                         //Ancho del logo
    height: 100                         //Alto del logo           
};

let flappyBirdTextImg = new Image();                        //Define la imagen del texto del juego
flappyBirdTextImg.src = "./Sprites/flappyBirdLogo.png";      //Ruta de la imagen del texto del juego

let gameOverImg = new Image();                              //Define la imagen de game over                             
gameOverImg.src = "./Sprites/flappy-gameover.png";          //Ruta de la imagen de game over

let bird = {                       //Define las propiedades del pajaro                  
    x: 50,                          //Coordenada x inicial del pajaro           
    y: boardHeight / 2,              //Coordenada y inicial del pajaro
    width: 40,                          //Ancho del pajaro   
    height: 30                          //Alto del pajaro
}

//Variables de fisicas y movimiento del juego
let velocityY = 0;                  //Velocidad vertical del pajaro
let gravity = 0.5;                  //Gravedad que afecta al pajaro      
let birdY = boardHeight / 2;        //Posicion inicial en y del pajaro  

//Variables de las tuberias
let velocityX = -2;                 //Velocidad horizontal de las tuberias
let pipeWidth = 50;                 //Ancho de las tuberias
let pipeGap = 200;                  //Espacio entre las tuberias
let pipeArray = [];                 //Array que contiene las tuberias, necesario para la logica y colisiones
let pipeIntervalId;                 //Intervalo que genera las tuberias

//Funciones de las tuberias
function placePipes() {         //funcion que maneja las tuberias
    createPipes();
}

function createPipes() {        //funcion que crea las tuberias con gap random
    let maxTopPipeHeight = boardHeight - pipeGap - 50;          //define la altura maxima de la tuberia superior usando el espacio del canvas
    let topPipeHeight = Math.floor(Math.random() * maxTopPipeHeight);   //genera una altura random para la tuberia superior
    let bottomPipeHeight = boardHeight - topPipeHeight - pipeGap;       //calcula la altura de la tuberia inferior usando la altura de la tuberia superior y el gap

    let topPipe = {         //Definicion de la tuberia superior
        x: boardWidth,      //Posicion inicial en x de la tuberia, se asegura de que las tuberias aparezcan a la derecha lejos del canvas
        y: 0,               //Posicion inicial en y de la tuberia, se asegura de que la tuberia superior empiece desde arriba del canvas
        width: pipeWidth,
        height: topPipeHeight,
        img: topPipeImg,
        passed: false           //Variable para detectar si el pajaro ya paso por esta tuberia
    };

    let bottomPipe = {      //Definicion de la tuberia inferior, casi igual que la anterior
        x: boardWidth,
        y: topPipeHeight + pipeGap,
        width: pipeWidth,
        height: bottomPipeHeight,
        img: bottomPipeImg,
        passed: false
    };
    pipeArray.push(topPipe, bottomPipe);    //Agrega las tuberias al array de tuberias
}

//Iniciar el juego
window.onload = function () {                            //Funcion que inicia el juego, define el canvas y carga nuestros assets
    board = document.getElementById("board");           //Se conecta con el que esta definido en el HTML
    board.height = boardHeight;                         //Usamos los valores del canvas ya definidos
    board.width = boardWidth;                           //Usamos los valores del canvas ya definidos
    context = board.getContext("2d");                   //Definimos el contexto 2D para dibujar en el canvas

    birdImg = new Image();                              //Iniciamos la imagen del pajaro          
    birdImg.src = "./Sprites/flappybird.png";            //Ruta de la imagen del pajaro

    topPipeImg = new Image();                           //Iniciamos la imagen de la tuberia superior
    topPipeImg.src = "./Sprites/toppipe.png";            //Ruta de la imagen de la tuberia superior

    bottomPipeImg = new Image();                        //Iniciamos la imagen de la tuberia inferior
    bottomPipeImg.src = "./Sprites/bottompipe.png";      //Ruta de la imagen de la tuberia inferior

    playButtonImg = new Image();                                 //Iniciamos la imagen del boton de jugar          
    playButtonImg.src = "./Sprites/flappyBirdPlayButton.png";      //Ruta de la imagen del boton de jugar

    requestAnimationFrame(update);      //Iniciamos el loop del juego, llamando repetidamente a la funcion update
}

function update() {                 //Funcion principal del juego, maneja los estados y renderiza todo
    requestAnimationFrame(update);          //Se llama a si misma para crear un loop
    context.clearRect(0, 0, board.width, board.height); //Limpia el canvas

    if (currentState === GAME_STATE.MENU) {          //Condicional, si estamos en el menu, renderiza el menu
        renderMenu();
    } else if (currentState === GAME_STATE.PLAYING) {    //Condicional, si estamos jugando, renderiza el juego
        renderGame();
    } else if (currentState === GAME_STATE.DYING) {      //Condicional, si estas muriendo, renderiza la animacion de muerte
        renderDying();
    } else if (currentState === GAME_STATE.GAME_OVER) {  //Condicional, si estamos en gameover, renderiza gameover
        renderGameOver();
    }
}

function renderMenu() {         //Funcion que renderiza el menu
    if (backgroundImg.complete) {                                                //Si la imagen de fondo esta cargada, renderizarla
        context.drawImage(backgroundImg, 0, 0, boardWidth, boardHeight);
    }

    if (playButtonImg.complete) {                                    //Si la imagen del boton de jugar esta cargada renderizarla                  
        context.drawImage(playButtonImg, playButton.x, playButton.y, playButton.width, playButton.height);
    }

    if (flappyBirdTextImg.complete) {        //Si la imagen del texto del juego esta cargada
        let scaledWidth = logo.width;           //Configurar ancho escalado
        let scaledHeight = (flappyBirdTextImg.height / flappyBirdTextImg.width) * scaledWidth;  //Configurar alto escalado
        context.drawImage(flappyBirdTextImg, logo.x, logo.y, scaledWidth, scaledHeight);   //Renderizar el texto del juego
    }
}

function renderGame() {     //Funcion que renderiza el juego, se encarga del mov. del pajaro, logica de tuberias, puntaje, etc.
    if (backgroundImg.complete) {
        context.drawImage(backgroundImg, 0, 0, boardWidth, boardHeight);        //Renderiza el fondo
    }

    // Animación del pasto
    if (grassImg.complete) {
        grassX -= grassSpeed;

        //Dibuja las 2 imagenes seguidas para hacer un bucle
        context.drawImage(grassImg, grassX, grassY, boardWidth, 280);
        context.drawImage(grassImg, grassX + boardWidth, grassY, boardWidth, 280);

        //Se reinicia cuando sale del canvas
        if (grassX <= -boardWidth) {
            grassX = 0;
        }
    }

    // Movimiento del pájaro
    velocityY += gravity;           //Aplica gravedad a la velocidad vertical del pajaro
    bird.y = Math.max(bird.y + velocityY, 0); //Actualiza la posicion del pajaro, se asegura de que no se salga del canvas

    // Animación de rotación del pájaro
    context.save();               //Guarda el estado del canvas

    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);         // Mover el origen al centro del pájaro

    // Calcular rotación basada en la velocidad vertical
    let rotation = Math.max(Math.min(velocityY * 2.5, 90), -25) * Math.PI / 180;
    context.rotate(rotation);

    context.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);     //Renderiza el pajaro

    context.restore();          //Restaura el estado del canvas

    //Condicional para el gameover (primero dying)
    // Animación de muerte
    if (bird.y > board.height) {    //Condicional, si el pajaro se sale por abajo del canvas
        currentState = GAME_STATE.DYING; //activa el estado dying
        caidaAlta = false;          //No fue caida alta
        ruidosMuerte();        // Maneja sonidos de muerte
    }

    //Bucle para manejar todas las tuberias en el array, renderizarlas y sus colisiones
    for (let i = 0; i < pipeArray.length; i++) {             //Recorre todas las tuberias en el array
        let pipe = pipeArray[i];
        pipe.x += velocityX;             //Mueve la tuberia hacia la izquierda usando la velocidad horizontal

        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);   //Renderiza la tuberia sin escalar su altura

        //Condicional para sumar puntos si el pajaro paso la tuberia
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {      //Si el pajaro paso la tuberia y no se habia contado antes
            moneda.play();
            score += 0.5;          //Suma puntos 0.5 (par de tuberias = 1 punto)
            pipe.passed = true;     //Marca la tuberia como pasada
        }

        //Condicional para detectar colisiones entre el pajaro y las tuberias
        if (detectCollision(bird, pipe)) {       //Si hubo una colision entre el pajaro y la tuberia
            currentState = GAME_STATE.DYING;    //Activa el game over (animacion de dying)
            caidaAlta = true;       //Marca que fue caida alta
            ruidosMuerte();         //Maneja los sonidos de muerte
        }   
    }

    //Borra las tuberias que ya salieron del canvas
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {        //Loop que borra la primera tuberia del array que este fuera del array
        pipeArray.shift();
    }

    // Renderiza el puntaje (en el centro)
    context.font = "45px Flappy";       // Fuente y tamaño
    context.textAlign = "center";       // Alineación: centro horizontal del canvas
    context.textBaseline = "top";       // Posicionamiento vertical
    context.lineWidth = 6;              // Grosor del contorno
    context.strokeStyle = "black";      // Color del contorno
    context.fillStyle = "white";        // Color del texto
    const scoreX = boardWidth / 2;      // Centro horizontal del canvas
    const scoreY = 10;                  // Separación desde el borde superior (ajustable)
    context.strokeText(score, scoreX, scoreY);   // Contorno
    context.fillText(score, scoreX, scoreY);     // Relleno

    }

//Funcion que renderiza el game over
function renderGameOver() {
    if (backgroundImg.complete) {
        context.drawImage(backgroundImg, 0, 0, boardWidth, boardHeight);        //Renderiza el fondo
    }
    if (gameOverImg.complete) {  //Condicional, si la imagen de gameover esta cargada
        let imgWidth = 400;         //Ancho de la imagen gameover
        let imgHeight = 80;         //Alto de la imagen gameover
        let x = (boardWidth - imgWidth) / 2; //Coordenada x para centrar la imagen
        let y = boardHeight / 3;             //Coordenada y para posicionar la imagen

        context.drawImage(gameOverImg, x, y, imgWidth, imgHeight);  //Renderiza la imagen de gameover centrada

        // Formato del puntaje final
        let scoreText = `Puntaje: ${Math.floor(score)}`;     // Texto del puntaje final  
        context.font = "45px Flappy";                           // Fuente y tamaño texto
        context.textAlign = "center";                           // Alineación
        context.lineWidth = 6;                                  // Grosor del contorno
        context.strokeStyle = "black";                          // Color del contorno
        context.fillStyle = "white";                            // Color del texto
        context.strokeText(scoreText, boardWidth / 2, y + imgHeight + 50);  // Contorno
        context.fillText(scoreText, boardWidth / 2, y + imgHeight + 50);    // Relleno

        //Temporalmente bloquea el input para evitar un reinicio accidental
        inputLocked = true;
        setTimeout(() => {
            inputLocked = false;
        }, 1000);
    }
}

//Funcion que maneja el input del usuario basado en los estados del juego (basicamente los controles)
function handleKeyDown(e) {
    if (inputLocked) return;         //Si el input esta bloqueado, return

    if (e.code === "Space") {                                        //Condicional, si se presiono enter
        if (currentState === GAME_STATE.MENU) {                         //Si estamos en el menu de inicio
            startGame();                                                  //Iniciar el juego
        } else if (currentState === GAME_STATE.GAME_OVER) {              //Si estamos en gameover
            resetGame();                                                  //Reiniciar el juego
            currentState = GAME_STATE.MENU;                                 //Volver al menu
        } else if (currentState === GAME_STATE.PLAYING) {                //Si estamos jugando
            playSalto();
            velocityY = -6;                                                //Hacer que el pajaro salte
        }
    }
}

//Funcion que inicia el juego
function startGame() {
    currentState = GAME_STATE.PLAYING;      //Cambia el estado del juego, a jugando
    bird.y = birdY;         //Reinicia los valores del pajaro
    velocityY = 0;
    pipeArray = [];         //Reinicia las tuberias
    score = 0;              //Reinicia el puntaje
    golpePlayed = false;        //Reinicia las variables relacionadas a los ruidos de muerte
    muertePlayed = false;
    caidaAlta = false;
    caidaMuerte = false;

    //Condicional
    if (pipeIntervalId) {
        clearInterval(pipeIntervalId);          //Borra la creacion de tuberias anterior
    }

    pipeIntervalId = setInterval(placePipes, 1500);     //Define la creacion de tuberias. Cada 1.5 segundos
}

function resetGame() {      //Funcion que reinicia el juego despues de perder
    bird.y = birdY;         //Reinicia la posicion del pajaro
    pipeArray = [];         //Reinicia las tuberias
    score = 0;              //Reinicia el puntaje
    golpePlayed = false;        //Reinicia las variables relacionadas a los ruidos de muerte
    muertePlayed = false;
    caidaAlta = false;
    caidaMuerte = false;
}

function detectCollision(a, b) {        //Funcion que define las colisiones
    return a.x < b.x + b.width &&       //Se fija si la parte izquierda del pajaro se superpone con la parte derecha de la tuberia
        a.x + a.width > b.x &&          //Se fija si la parte derecha del pajaro se superpone con la parte izquierda de la tuberia
        a.y < b.y + b.height &&         //Se fija si la parte superior del pajaro se superpone con la parte inferior de la tuberia
        a.y + a.height > b.y;           //Se fija si la parte inferior del pajaro se superpone con la parte superior de la tuberia
}

function renderDying() {
    if (backgroundImg.complete) {
        context.drawImage(backgroundImg, 0, 0, boardWidth, boardHeight);
    }
    if (grassImg.complete) {
        context.drawImage(grassImg, grassX, grassY, boardWidth, 280);
        context.drawImage(grassImg, grassX + boardWidth, grassY, boardWidth, 280);
    }
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
    }

    // Animación de caída del pájaro
    ruidosMuerte();
    velocityY += gravity;
    bird.y += velocityY;

    // Evitar que el pájaro se entierre en el piso
    if (bird.y + bird.height > boardHeight) {
        bird.y = boardHeight - bird.height;
    }

    // Rotación hacia abajo
    context.save();
    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    let rotation;
    if (bird.y + bird.height >= boardHeight) {
        rotation = 90 * Math.PI / 180;         // Fuerza rotación máxima al tocar el piso
    } else {
        rotation = Math.min(velocityY * 5, 90) * Math.PI / 180;
    }
    context.rotate(rotation);
    context.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    context.restore()

    // Cuando toca el piso, pasa a GAME_OVER después de un breve delay
    if (bird.y + bird.height >= boardHeight) {
        bird.y = boardHeight - bird.height;
        setTimeout(() => {
            currentState = GAME_STATE.GAME_OVER;
        }, 400);
    }
}