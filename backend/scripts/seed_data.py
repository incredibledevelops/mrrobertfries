"""
Seed script — creates branches, admin/staff/kitchen/rider accounts,
categories, menu items, builder options, delivery zones and promo codes.

Run:
    python -m scripts.seed_data
"""

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.database import close_db, init_db
from app.crud import branch as branch_crud
from app.crud import builder as builder_crud
from app.crud import category as category_crud
from app.crud import delivery_zone as zone_crud
from app.crud import menu as menu_crud
from app.crud import promo_code as promo_crud
from app.crud import user as user_crud
from app.models import ALL_DOCUMENTS
from app.models.branch import Branch
from app.models.builder_option import BuilderOption, BuilderOptionType
from app.models.delivery_zone import DeliveryZone
from app.models.menu_item import MenuItem
from app.models.promo_code import DiscountType
from app.models.user import UserRole

BRANCHES = [
    {
        "name": "Accra (East Legon)",
        "slug": "accra",
        "description": "Main kitchen — East Legon, Accra.",
        "phone": "0599233488",
        "email": "accra@mrfries.com",
        "address": "Boundary Road, East Legon",
        "city": "Accra",
        "region": "Greater Accra",
        "opening_hours": "11:00-23:00",
        "is_default": True,
        "display_order": 1,
    },
    {
        "name": "Kumasi (KNUST)",
        "slug": "kumasi",
        "description": "Kumasi hub — Bomso & Ayeduase.",
        "phone": "0599233499",
        "email": "kumasi@mrfries.com",
        "address": "Bomso Road, near KNUST",
        "city": "Kumasi",
        "region": "Ashanti",
        "opening_hours": "11:00-23:00",
        "is_default": False,
        "display_order": 2,
    },
]

CATEGORIES = [
    {"name": "Loaded Fry Bowls", "description": "Golden fries loaded with cheese, meats & sauces.", "display_order": 1},
    {"name": "Chicken & Wings", "description": "Crispy fried chicken, jumbo wings & glazes.", "display_order": 2},
    {"name": "Yam Chips Specials", "description": "Fried Ghanaian yam with pepper sauce & proteins.", "display_order": 3},
]

MENU_ITEMS = [
    ("Loaded Fry Bowls", "The Robert Special Bowl", 75.0,
     "Crispy French fries topped with shredded fried chicken, melted cheddar, hot shito aioli & spring onions.",
     ["loaded", "signature"],
     "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA"),
    ("Loaded Fry Bowls", "Gourmet Loaded Bacon & Beef Fries", 85.0,
     "Towering stack of cut fries, savory beef strips, crispy bacon, house garlic mayo & melted cheese.",
     ["loaded", "beef"],
     "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcQZIVU6dfIKhmvXbmOQOTkIJf3oFTUVmDoJ_XXWaPr5S04-HCaxkF_T1tZKbK4uaqFq_XhOXaFCBK7xQWk"),
    ("Chicken & Wings", "Golden Fried Chicken & Fries Basket", 65.0,
     "3 big pieces of crunchy seasoned Ghanaian fried chicken with crispy salted fries & spicy dip.",
     ["chicken"],
     "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQVPnztBY-ojOTfqYb7ZEBDXh71696NaWpCbX5SBCnkaqcsQcmLg5sZWnsFS4Z_wkadX81IrY2E2H1Y-rg"),
    ("Chicken & Wings", "Sticky Sweet & Spicy Wings (6pcs)", 60.0,
     "Jumbo chicken wings tossed in Mr. Robert's signature sweet chili BBQ glaze.",
     ["wings"],
     "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTjffCBCbAKb_lTZy5lLbtDPCQSqFr2jSgHwPdAGSr1SGp3gFi58FP9em4prkPXUxCHBzN-yD31BCljs6k"),
    ("Yam Chips Specials", "Fried Yam Chips & Pepper Chicken Special", 55.0,
     "Golden fried Ghanaian yam slices served with grilled chicken, green pepper sauce & extra shito.",
     ["yam"],
     "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcRP0ZwKTTEIQkagbbKR61JM-9RmqzLZY50-_r4j7A9tIy9vf56y6wbXqgT4iYbdoU3S4pint1M1-j5EBtU"),
    ("Loaded Fry Bowls", "Spicy Peppered Gizzard & Fries Combo", 60.0,
     "Soft fried gizzard tossed in rich pepper sauce served over hot French fries.",
     ["loaded", "gizzard"],
     "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA"),
]

BUILDER_OPTIONS = [
    (BuilderOptionType.BASE, "Crispy French Fries", 25.0, True, 1),
    (BuilderOptionType.BASE, "Fried Yam Chips", 25.0, False, 2),
    (BuilderOptionType.BASE, "Sweet Potato Fries", 30.0, False, 3),
    (BuilderOptionType.BASE, "Half Fries & Half Yam", 28.0, False, 4),
    (BuilderOptionType.PROTEIN, "Crispy Fried Chicken", 25.0, True, 1),
    (BuilderOptionType.PROTEIN, "Spicy Sausages", 15.0, False, 2),
    (BuilderOptionType.PROTEIN, "Grilled BBQ Wings", 30.0, False, 3),
    (BuilderOptionType.PROTEIN, "Peppered Gizzard", 20.0, False, 4),
    (BuilderOptionType.PROTEIN, "Beef Steak Strips", 35.0, False, 5),
    (BuilderOptionType.SAUCE, "Spicy Shito Aioli", 0.0, True, 1),
    (BuilderOptionType.SAUCE, "Creamy Garlic Mayo", 0.0, False, 2),
    (BuilderOptionType.SAUCE, "Melted Cheddar Sauce", 0.0, False, 3),
    (BuilderOptionType.SAUCE, "Sweet Chili BBQ", 0.0, False, 4),
    (BuilderOptionType.TOPPING, "Spring Onions", 0.0, False, 1),
    (BuilderOptionType.TOPPING, "Extra Cheese", 5.0, False, 2),
    (BuilderOptionType.TOPPING, "Chili Flakes", 0.0, False, 3),
]

ZONES_ACCRA = [
    ("UG Legon Campus", "UG Main Campus, Evandy, TF, Pent & UPSA Hostel areas.", 15.0, 30, 1),
    ("East Legon / Adjiringanor", "Adjiringanor, Shiashie, Boundary Road & American House.", 20.0, 40, 2),
    ("UPSA / Madina", "Zongo Junction, Firestone & Ritz Junction.", 20.0, 40, 3),
    ("Adenta / Ritz Junction", "Adenta Housing Down, Ritz Junction.", 25.0, 50, 4),
]

ZONES_KUMASI = [
    ("KNUST Bomso", "Bomso & Ayeduase delivery hub.", 15.0, 30, 1),
    ("KNUST Ayeduase", "Ayeduase North & South.", 15.0, 30, 2),
    ("Kumasi Central", "Adum, Kejetia & surrounding areas.", 25.0, 50, 3),
]


async def seed_branches():
    branch_map = {}
    for b in BRANCHES:
        existing = await branch_crud.get_by_slug(b["slug"])
        if existing:
            branch_map[b["slug"]] = existing
            print(f"   ↷ branch exists: {b['name']}")
            continue
        created = await branch_crud.create_branch(b)
        branch_map[b["slug"]] = created
        print(f"   ✓ branch created: {b['name']}")
    return branch_map


async def seed_users(branch_map):
    accra = branch_map["accra"]
    kumasi = branch_map["kumasi"]

    users = [
        ("Mr. Robert Admin", "admin@mrfries.com", "Admin@1234", "0599233488",
         UserRole.ADMIN, None, None, None),
        ("Accra Staff", "staff@mrfries.com", "Staff@1234", "0599233489",
         UserRole.STAFF, None, None, str(accra.id)),
        ("Accra Kitchen", "kitchen@mrfries.com", "Kitchen@1234", "0599233490",
         UserRole.KITCHEN, None, None, str(accra.id)),
        ("Kumasi Kitchen", "kitchen.ks@mrfries.com", "Kitchen@1234", "0599233495",
         UserRole.KITCHEN, None, None, str(kumasi.id)),
        ("Kwame Rider", "rider@mrfries.com", "Rider@1234", "0599233491",
         UserRole.RIDER, "Motorbike", "GT-1234-22", str(accra.id)),
        ("Ama Rider", "rider2@mrfries.com", "Rider@1234", "0599233492",
         UserRole.RIDER, "Motorbike", "GT-5678-22", str(accra.id)),
        ("Kofi Rider (KS)", "rider.ks@mrfries.com", "Rider@1234", "0599233497",
         UserRole.RIDER, "Motorbike", "AS-1122-22", str(kumasi.id)),
    ]

    created = 0
    for name, email, password, phone, role, vehicle, plate, branch_id in users:
        if await user_crud.get_by_email(email):
            print(f"   ↷ user exists: {email}")
            continue
        user = await user_crud.create_user(
            full_name=name, email=email, password=password, phone=phone, role=role,
        )
        if branch_id:
            from beanie import PydanticObjectId
            user.branch_id = PydanticObjectId(branch_id)
        if vehicle:
            user.vehicle = vehicle
        if plate:
            user.plate_number = plate
        await user.save()
        print(f"   ✓ {role.value}: {email} / {password}")
        created += 1
    print(f"✅ Users ensured: {created} new")


async def seed_promos():
    now = datetime.now(timezone.utc)
    promos = [
        {"code": "WELCOME10", "description": "10% off your first order",
         "discount_type": DiscountType.PERCENT, "discount_value": 10.0,
         "min_order_total": 30.0, "max_discount": 20.0, "per_customer_limit": 1, "is_active": True},
        {"code": "FREESHIP", "description": "Free delivery on orders above GH₵ 50",
         "discount_type": DiscountType.FREE_DELIVERY, "min_order_total": 50.0,
         "per_customer_limit": 3, "is_active": True},
        {"code": "UGLEGON5", "description": "GH₵ 5 off for UG Legon students",
         "discount_type": DiscountType.FIXED, "discount_value": 5.0,
         "min_order_total": 40.0, "per_customer_limit": 5, "is_active": True},
        {"code": "FRIYAY", "description": "15% off every Friday",
         "discount_type": DiscountType.PERCENT, "discount_value": 15.0,
         "min_order_total": 60.0, "max_discount": 30.0, "per_customer_limit": 2, "is_active": True},
        {"code": "EXPIRED2024", "description": "Old promo (for testing expiry)",
         "discount_type": DiscountType.FIXED, "discount_value": 10.0,
         "valid_until": now - timedelta(days=1), "is_active": True},
    ]
    added = 0
    for p in promos:
        if await promo_crud.get_by_code(p["code"]):
            continue
        await promo_crud.create_promo(p)
        print(f"   ✓ promo created: {p['code']}")
        added += 1
    print(f"✅ Promo codes added: {added}")


async def seed():
    await init_db(ALL_DOCUMENTS)
    print("🌱 Seeding database...")

    branch_map = await seed_branches()
    await seed_users(branch_map)

    cat_map = {}
    for c in CATEGORIES:
        existing = await category_crud.get_by_slug(category_crud.slugify(c["name"]))
        cat_map[c["name"]] = existing or await category_crud.create_category(c)
    print(f"✅ Categories ready: {len(cat_map)}")

    added = skipped = 0
    for cat_name, name, price, desc, tags, img in MENU_ITEMS:
        slug = menu_crud.slugify(name)
        if await MenuItem.find_one(MenuItem.slug == slug):
            skipped += 1
            continue
        await menu_crud.create_item({
            "name": name, "slug": slug, "description": desc, "price": price,
            "category_id": str(cat_map[cat_name].id), "image_url": img,
            "tags": tags, "is_available": True, "display_order": added,
        })
        added += 1
    print(f"✅ Menu items added: {added} (skipped {skipped})")

    added = skipped = 0
    for opt_type, name, price, default, order in BUILDER_OPTIONS:
        if await BuilderOption.find_one(
            BuilderOption.type == opt_type, BuilderOption.name == name
        ):
            skipped += 1
            continue
        await builder_crud.create_option({
            "type": opt_type, "name": name, "price": price,
            "is_default": default, "is_available": True, "display_order": order,
        })
        added += 1
    print(f"✅ Builder options added: {added} (skipped {skipped})")

    # Zones per branch
    added = skipped = 0
    accra_id = str(branch_map["accra"].id)
    kumasi_id = str(branch_map["kumasi"].id)
    for name, desc, fee, mins, order in ZONES_ACCRA:
        if await DeliveryZone.find_one(DeliveryZone.name == name):
            skipped += 1
            continue
        await zone_crud.create_zone({
            "name": name, "description": desc, "delivery_fee": fee,
            "estimated_minutes": mins, "is_active": True, "display_order": order,
            "branch_id": accra_id,
        })
        added += 1
    for name, desc, fee, mins, order in ZONES_KUMASI:
        if await DeliveryZone.find_one(DeliveryZone.name == name):
            skipped += 1
            continue
        await zone_crud.create_zone({
            "name": name, "description": desc, "delivery_fee": fee,
            "estimated_minutes": mins, "is_active": True, "display_order": order,
            "branch_id": kumasi_id,
        })
        added += 1
    print(f"✅ Delivery zones added: {added} (skipped {skipped})")

    await seed_promos()

    await close_db()
    print("🎉 Seeding complete!")
    print("")
    print("Login credentials:")
    print("  Admin:        admin@mrfries.com / Admin@1234")
    print("  Kitchen Acc:  kitchen@mrfries.com / Kitchen@1234")
    print("  Kitchen KS:   kitchen.ks@mrfries.com / Kitchen@1234")
    print("  Rider Acc:    rider@mrfries.com / Rider@1234")
    print("  Rider KS:     rider.ks@mrfries.com / Rider@1234")


if __name__ == "__main__":
    asyncio.run(seed())