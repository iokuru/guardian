from fastapi import FastAPI

from app.api.analysis import router as analysis_router


app = FastAPI(title="GUARDIAN")


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(analysis_router)