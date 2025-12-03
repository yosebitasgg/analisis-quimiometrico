"""
Chemometrics Helper - Backend FastAPI
Herramienta de análisis multivariado para quimiometría
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import data, pca, clustering, classifier, similarity, report

app = FastAPI(
    title="Chemometrics Helper API",
    description="API para análisis multivariado en quimiometría (PCA, Clustering, Clasificación, Similitud)",
    version="2.0.0"
)

# Configurar CORS para permitir requests del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers existentes
app.include_router(data.router, prefix="/api/data", tags=["Datos"])
app.include_router(pca.router, prefix="/api/pca", tags=["PCA"])
app.include_router(clustering.router, prefix="/api/clustering", tags=["Clustering"])

# Nuevos routers
app.include_router(classifier.router, prefix="/api/classifier", tags=["Clasificador"])
app.include_router(similarity.router, prefix="/api/similarity", tags=["Similitud"])
app.include_router(report.router, prefix="/api/report", tags=["Reportes"])


@app.get("/")
async def root():
    return {
        "mensaje": "Bienvenido a Chemometrics Helper API",
        "version": "2.0.0",
        "endpoints": {
            "datos": "/api/data",
            "pca": "/api/pca",
            "clustering": "/api/clustering",
            "clasificador": "/api/classifier",
            "similitud": "/api/similarity",
            "reportes": "/api/report"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}
