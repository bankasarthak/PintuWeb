from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class NotFoundError(Exception):
    status_code: int = status.HTTP_404_NOT_FOUND

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class UnauthorizedError(Exception):
    status_code: int = status.HTTP_401_UNAUTHORIZED

    def __init__(self, detail: str = "Not authenticated") -> None:
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(Exception):
    status_code: int = status.HTTP_403_FORBIDDEN

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ConflictError(Exception):
    status_code: int = status.HTTP_409_CONFLICT

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class AppValidationError(Exception):
    status_code: int = 422

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ServiceError(Exception):
    status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


_APP_EXCEPTIONS = (
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    AppValidationError,
    ServiceError,
)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                "HTTP %s on %s %s: %s",
                exc.status_code,
                request.method,
                request.url.path,
                exc.detail,
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    for exc_class in _APP_EXCEPTIONS:

        async def _handler(
            request: Request,
            exc: Exception,
            _cls: type = exc_class,  # capture loop variable
        ) -> JSONResponse:
            if _cls.status_code >= 500:  # type: ignore[attr-defined]
                logger.error(
                    "%s on %s %s: %s",
                    _cls.__name__,
                    request.method,
                    request.url.path,
                    exc,
                )
            return JSONResponse(
                status_code=_cls.status_code,  # type: ignore[attr-defined]
                content={"detail": str(exc)},
            )

        app.add_exception_handler(exc_class, _handler)  # type: ignore[arg-type]
