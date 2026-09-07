"""add severity to findings

Revision ID: 917155736a08
Revises: 775948476015
Create Date: 2026-09-07 23:33:42.811329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '917155736a08'
down_revision: Union[str, Sequence[str], None] = '775948476015'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
