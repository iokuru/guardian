from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.analysis import router as analysis_router


app = FastAPI(title="GUARDIAN")


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError,
):
    return JSONResponse(
        status_code=500,
        content={"detail": "Analysis could not be persisted"},
    )


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(analysis_router)