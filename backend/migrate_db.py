from sqlalchemy import inspect, text

from database import engine


def migrate_database():

    inspector = inspect(engine)

    tables = inspector.get_table_names()

    if "tasks" not in tables:

        print("Tasks table does not exist. Creating it through init_db.py.")
        return

    columns = {
        column["name"]
        for column in inspector.get_columns("tasks")
    }

    migrations = {
        "priority": (
            "ALTER TABLE tasks "
            "ADD COLUMN priority VARCHAR "
            "DEFAULT 'Medium' NOT NULL"
        ),

        "category": (
            "ALTER TABLE tasks "
            "ADD COLUMN category VARCHAR "
            "DEFAULT 'Other' NOT NULL"
        ),

        "due_date": (
            "ALTER TABLE tasks "
            "ADD COLUMN due_date DATETIME"
        ),

        "estimated_minutes": (
            "ALTER TABLE tasks "
            "ADD COLUMN estimated_minutes INTEGER "
            "DEFAULT 30 NOT NULL"
        ),
    }

    with engine.begin() as connection:

        for column_name, sql in migrations.items():

            if column_name not in columns:

                connection.execute(text(sql))

                print(
                    f"Added column: {column_name}"
                )

            else:

                print(
                    f"Column already exists: {column_name}"
                )

    print("\nNexaOS AI database migration completed successfully.")


if __name__ == "__main__":
    migrate_database()