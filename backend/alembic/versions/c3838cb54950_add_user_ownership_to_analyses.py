"""add user ownership to analyses

Revision ID: c3838cb54950
Revises: 18a6f8c8b7ff
Create Date: 2026-09-08 13:32:33.963594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3838cb54950'
down_revision = "18a6f8c8b7ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass