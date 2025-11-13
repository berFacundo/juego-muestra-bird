// Encapsulamos para evitar globals y exponemos lo mínimo necesario
(() => {
  const MODEL_URL_CAM = "https://teachablemachine.withgoogle.com/models/dJNd3vMnK/";
  let model = null;
  let maxPredictions = 0;
  const VIDEO_ID = "videoElement";
  const RESULT_ID = "resultado";

  // Expuesta para que el juego la pueda usar
  window.claseActual = "";

  // Crear elementos si no existen (evita que el juego los borre y no existan)
  function ensureElements() {
    if (!document.getElementById(VIDEO_ID)) {
      const v = document.createElement("video");
      v.id = VIDEO_ID;
      v.autoplay = true;
      v.playsInline = true;
      v.style.width = "400px";
      v.style.height = "300px";
      v.style.background = "#666";
      document.body.appendChild(v);
      console.log("camara.js: video creado dinámicamente");
    }
    if (!document.getElementById(RESULT_ID)) {
      const d = document.createElement("div");
      d.id = RESULT_ID;
      d.innerText = "Esperando cámara...";
      d.style.fontSize = "18px";
      d.style.fontWeight = "600";
      document.body.appendChild(d);
      console.log("camara.js: resultado creado dinámicamente");
    }
  }

  // Variables de DOM
  let video;
  let resultadoDiv;

  async function initCamera() {
    try {
      video = document.getElementById(VIDEO_ID);
      resultadoDiv = document.getElementById(RESULT_ID);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      resultadoDiv.innerText = "Cámara iniciada correctamente.";
      console.log("camara.js: cámara iniciada");
    } catch (err) {
      console.error("camara.js: Error al acceder a la cámara:", err);
      if (resultadoDiv) resultadoDiv.innerText = "Error al acceder a la cámara: " + (err.name || err.message);
      throw err; // re-lanzar para saber que falló
    }
  }

  async function initModel() {
    try {
      const modelURL = MODEL_URL_CAM + "model.json";
      const metadataURL = MODEL_URL_CAM + "metadata.json";
      console.log("camara.js: cargando modelo desde", modelURL);
      model = await tmImage.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
      console.log("camara.js: Modelo cargado correctamente. Clases:", maxPredictions);
    } catch (err) {
      console.error("camara.js: Error cargando modelo:", err);
      if (resultadoDiv) resultadoDiv.innerText = "Error cargando modelo: " + (err.message || err);
      throw err;
    }
  }

  async function predictLoop() {
    try {
      if (!model || !video) return requestAnimationFrame(predictLoop);
      if (video.readyState !== 4) {
        // video no listo aún
        return requestAnimationFrame(predictLoop);
      }

      const prediction = await model.predict(video);
      let maxProb = 0;
      let clase = "";

      prediction.forEach((p) => {
        if (p.probability > maxProb) {
          maxProb = p.probability;
          clase = p.className;
        }
      });

      window.claseActual = clase;
      if (resultadoDiv) resultadoDiv.innerText = `Clase: ${clase} (${(maxProb * 100).toFixed(1)}%)`;
    } catch (err) {
      console.error("camara.js: error en predictLoop:", err);
      // no lanzar para no romper el loop
    } finally {
      requestAnimationFrame(predictLoop);
    }
  }

  // Control de gestos
  let lastHandState = false;
  function handJumpLoop() {
      if (window.claseActual === "Abierta") {
          if (!lastHandState) {
              const event = new KeyboardEvent('keydown', {
                  code: 'Space',
                  key: ' ',
                  keyCode: 32,
                  which: 32,
                  bubbles: true,
                  cancelable: true
              });
              document.dispatchEvent(event);
              window.dispatchEvent(event);
              lastHandState = true;
          }
      } else {
          lastHandState = false;
      }
      requestAnimationFrame(handJumpLoop);
  }

  // Inicializar todo cuando DOM listo
  async function init() {
    try {
      ensureElements();
      // ahora que los elementos existen, referenciarlos
      video = document.getElementById(VIDEO_ID);
      resultadoDiv = document.getElementById(RESULT_ID);

      await initCamera();
      await initModel();
      predictLoop();
      handJumpLoop(); // <-- Inicia el loop de salto por gesto
    } catch (err) {
      console.error("camara.js: init fallo:", err);
    }
  }

  // Usar addEventListener para no pisar otros onload
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // DOM ya listo
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
