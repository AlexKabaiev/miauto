"""Clients API — CRUD + vehicles."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func as sa_func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client, ClientVehicle
from app.schemas.client import (
    ClientCreate,
    ClientListItem,
    ClientRead,
    ClientUpdate,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
)

router = APIRouter(prefix="/api/clients", tags=["clients"])


# ── List ─────────────────────────────────────────────────────────────────
@router.get("", response_model=dict)
def list_clients(
    search: Optional[str] = Query(None, description="Пошук по ФІО або телефону"),
    skip: int = 0,
    limit: int = 50,
    show_archived: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Client)
    if not show_archived:
        q = q.filter(Client.is_archived == False)  # noqa: E712
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Client.fio.ilike(like), Client.phone.ilike(like)))
    total = q.count()
    items = q.order_by(Client.fio).offset(skip).limit(limit).all()
    return {
        "items": [ClientListItem.model_validate(c) for c in items],
        "total": total,
    }


# ── Detail ───────────────────────────────────────────────────────────────
@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    return client


# ── Create ───────────────────────────────────────────────────────────────
@router.post("", response_model=ClientRead, status_code=201)
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


# ── Update ───────────────────────────────────────────────────────────────
@router.put("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client


# ── Delete ───────────────────────────────────────────────────────────────
@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    db.delete(client)
    db.commit()


# ══════════════════════════════════════════════════════════════════════════
# Vehicles
# ══════════════════════════════════════════════════════════════════════════
@router.get("/{client_id}/vehicles", response_model=list[VehicleRead])
def list_vehicles(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    return client.vehicles


@router.post("/{client_id}/vehicles", response_model=VehicleRead, status_code=201)
def add_vehicle(client_id: int, data: VehicleCreate, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    vehicle = ClientVehicle(client_id=client_id, **data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put("/{client_id}/vehicles/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    client_id: int,
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
):
    vehicle = db.query(ClientVehicle).filter_by(id=vehicle_id, client_id=client_id).first()
    if not vehicle:
        raise HTTPException(404, "Авто не знайдено")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle
