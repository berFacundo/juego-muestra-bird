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