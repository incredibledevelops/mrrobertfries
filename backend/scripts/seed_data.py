"""
Seed script: creates an admin account, categories, menu items,
builder options, and delivery zones matching the frontend.

Run:
    python -m scripts.seed_data
"""

import asyncio

from app.core.database import close_db, init_db
from app.core.security import hash_password
from app.crud import builder as builder_crud
from app.crud import category as category_crud
from app.crud import delivery_zone as zone_crud
from app.crud import menu as menu_crud
from app.crud import user as user_crud
from app.models import ALL_DOCUMENTS
from app.models.builder_option import BuilderOptionType
from app.models.user import UserRole

CATEGORIES = [
    {
        "name": "Loaded Fry Bowls",
        "description": "Golden fries loaded with cheese, meats & sauces.",
        "display_order": 1,
    },
    {
        "name": "Chicken & Wings",
        "description": "Crispy fried chicken, jumbo wings & glazes.",
        "display_order": 2,
    },
    {
        "name": "Yam Chips Specials",
        "description": "Fried Ghanaian yam with pepper sauce & proteins.",
        "display_order": 3,
    },
]

MENU_ITEMS = [
    # category, name, price, description, tags, image (remote link from frontend)
    (
        "Loaded Fry Bowls",
        "The Robert Special Bowl",
        75.0,
        "Crispy French fries topped with shredded fried chicken, melted cheddar, hot shito aioli & spring onions.",
        ["loaded", "signature"],
        "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA",
    ),
    (
        "Loaded Fry Bowls",
        "Gourmet Loaded Bacon & Beef Fries",
        85.0,
        "Towering stack of cut fries, savory beef strips, crispy bacon, house garlic mayo & melted cheese.",
        ["loaded", "beef"],
        "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcQZIVU6dfIKhmvXbmOQOTkIJf3oFTUVmDoJ_XXWaPr5S04-HCaxkF_T1tZKbK4uaqFq_XhOXaFCBK7xQWk",
    ),
    (
        "Chicken & Wings",
        "Golden Fried Chicken & Fries Basket",
        65.0,
        "3 big pieces of crunchy seasoned Ghanaian fried chicken with crispy salted fries & spicy dip.",
        ["chicken"],
        "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQVPnztBY-ojOTfqYb7ZEBDXh71696NaWpCbX5SBCnkaqcsQcmLg5sZWnsFS4Z_wkadX81IrY2E2H1Y-rg",
    ),
    (
        "Chicken & Wings",
        "Sticky Sweet & Spicy Wings (6pcs)",
        60.0,
        "Jumbo chicken wings tossed in Mr. Robert's signature sweet chili BBQ glaze.",
        ["wings"],
        "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTjffCBCbAKb_lTZy5lLbtDPCQSqFr2jSgHwPdAGSr1SGp3gFi58FP9em4prkPXUxCHBzN-yD31BCljs6k",
    ),
    (
        "Yam Chips Specials",
        "Fried Yam Chips & Pepper Chicken Special",
        55.0,
        "Golden fried Ghanaian yam slices served with grilled chicken, green pepper sauce & extra shito.",
        ["yam"],
        "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcRP0ZwKTTEIQkagbbKR61JM-9RmqzLZY50-_r4j7A9tIy9vf56y6wbXqgT4iYbdoU3S4pint1M1-j5EBtU",
    ),
    (
        "Loaded Fry Bowls",
        "Spicy Peppered Gizzard & Fries Combo",
        60.0,
        "Soft fried gizzard tossed in rich pepper sauce served over hot French fries.",
        ["loaded", "gizzard"],
        "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA",
    ),
]

BUILDER_OPTIONS = [
    # Bases
    (BuilderOptionType.BASE, "Crispy French Fries", 25.0, True, 1),
    (BuilderOptionType.BASE, "Fried Yam Chips", 25.0, False, 2),
    (BuilderOptionType.BASE, "Sweet Potato Fries", 30.0, False, 3),
    (BuilderOptionType.BASE, "Half Fries & Half Yam", 28.0, False, 4),
    # Proteins
    (BuilderOptionType.PROTEIN, "Crispy Fried Chicken", 25.0, True, 1),
    (BuilderOptionType.PROTEIN, "Spicy Sausages", 15.0, False, 2),
    (BuilderOptionType.PROTEIN, "Grilled BBQ Wings", 30.0, False, 3),
    (BuilderOptionType.PROTEIN, "Peppered Gizzard", 20.0, False, 4),
    (BuilderOptionType.PROTEIN, "Beef Steak Strips", 35.0, False, 5),
    # Sauces
    (BuilderOptionType.SAUCE, "Spicy Shito Aioli", 0.0, True, 1),
    (BuilderOptionType.SAUCE, "Creamy Garlic Mayo", 0.0, False, 2),
    (BuilderOptionType.SAUCE, "Melted Cheddar Sauce", 0.0, False, 3),
    (BuilderOptionType.SAUCE, "Sweet Chili BBQ", 0.0, False, 4),
    # Toppings
    (BuilderOptionType.TOPPING, "Spring Onions", 0.0, False, 1),
    (BuilderOptionType.TOPPING, "Extra Cheese", 5.0, False, 2),
    (BuilderOptionType.TOPPING, "Chili Flakes", 0.0, False, 3),
]

DELIVERY_ZONES = [
    ("UG Legon Campus", "UG Main Campus, Evandy, TF, Pent & UPSA Hostel areas.", 15.0, 30, 1),
    ("East Legon / Adjiringanor", "Adjiringanor, Shiashie, Boundary Road & American House.", 20.0, 40, 2),
    ("UPSA / Madina", "Zongo Junction, Firestone & Ritz Junction.", 20.0, 40, 3),
    ("Adenta / Ritz Junction", "Adenta Housing Down, Ritz Junction.", 25.0, 50, 4),
    ("Kumasi KNUST (Bomso)", "Bomso & Ayeduase delivery hub.", 30.0, 60, 5),
]


async def seed():
    await init_db(ALL_DOCUMENTS)
    print("🌱 Seeding database...")

    # --- Admin user ---
    if not await user_crud.get_by_email("admin@mrfries.com"):
        await user_crud.create_user(
            full_name="Mr. Robert Admin",
            email="admin@mrfries.com",
            password="Admin@1234",
            phone="0599233488",
            role=UserRole.ADMIN,
        )
        print("✅ Admin created: admin@mrfries.com / Admin@1234")

    if not await user_crud.get_by_email("staff@mrfries.com"):
        await user_crud.create_user(
            full_name="Kitchen Staff",
            email="staff@mrfries.com",
            password="Staff@1234",
            phone="0599233489",
            role=UserRole.STAFF,
        )
        print("✅ Staff created: staff@mrfries.com / Staff@1234")

    # --- Categories ---
    cat_map = {}
    for c in CATEGORIES:
        existing = await category_crud.get_by_slug(category_crud.slugify(c["name"]))
        if existing:
            cat_map[c["name"]] = existing
        else:
            created = await category_crud.create_category(c)
            cat_map[c["name"]] = created
    print(f"✅ Categories ready: {len(cat_map)}")

    # --- Menu items ---
    added = 0
    for cat_name, name, price, desc, tags, img in MENU_ITEMS:
        slug = menu_crud.slugify(name)
        existing = await menu_crud.list_items(search=name)
        if existing:
            continue
        await menu_crud.create_item(
            {
                "name": name,
                "slug": slug,
                "description": desc,
                "price": price,
                "category_id": str(cat_map[cat_name].id),
                "image_url": img,
                "tags": tags,
                "is_available": True,
                "display_order": added,
            }
        )
        added += 1
    print(f"✅ Menu items added: {added}")

    # --- Builder options ---
    added = 0
    existing_opts = await builder_crud.list_options()
    existing_names = {(o.type, o.name) for o in existing_opts}
    for opt_type, name, price, default, order in BUILDER_OPTIONS:
        if (opt_type, name) in existing_names:
            continue
        await builder_crud.create_option(
            {
                "type": opt_type,
                "name": name,
                "price": price,
                "is_default": default,
                "is_available": True,
                "display_order": order,
            }
        )
        added += 1
    print(f"✅ Builder options added: {added}")

    # --- Delivery zones ---
    added = 0
    existing_zones = await zone_crud.list_zones()
    existing_names = {z.name for z in existing_zones}
    for name, desc, fee, mins, order in DELIVERY_ZONES:
        if name in existing_names:
            continue
        await zone_crud.create_zone(
            {
                "name": name,
                "description": desc,
                "delivery_fee": fee,
                "estimated_minutes": mins,
                "is_active": True,
                "display_order": order,
            }
        )
        added += 1
    print(f"✅ Delivery zones added: {added}")

    await close_db()
    print("🎉 Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())