"""
db_schema.py — MongoDB Schema Validation & Index Management
===========================================================
Applies JSON Schema validation and performance indexes to the `users` and
`connections` collections. Safe to call on every app startup — MongoDB
treats both collMod (schema update) and createIndex (existing index) as
no-ops if nothing has changed.
"""

import logging

logger = logging.getLogger(__name__)

# ─── Users Collection Schema ─────────────────────────────────────────────────

USERS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        # email is the only truly hard-required field; names come in as snake_case from
        # UserProfile.to_mongo_document() or camelCase from the PATCH endpoint.
        # We require at least email to gate the unique index.
        "required": ["email"],
        "additionalProperties": True,
        "properties": {
            "email": {
                "bsonType": "string",
                "pattern": "^[a-zA-Z0-9._%+\\-]+@(mail\\.mcgill\\.ca|mcgill\\.ca)$",
                "description": "Must be a valid McGill email address."
            },
            # snake_case keys written by UserProfile.to_mongo_document()
            "first_name":  {"bsonType": "string", "minLength": 1},
            "last_name":   {"bsonType": "string", "minLength": 1},
            "graduation_year": {
                "bsonType": ["int", "double"],
                "minimum": 2000,
                "maximum": 2040
            },
            # camelCase keys written by the PATCH /api/user endpoint
            "firstName":       {"bsonType": ["string", "null"]},
            "lastName":        {"bsonType": ["string", "null"]},
            "graduationYear":  {"bsonType": ["int", "double", "null"]},
            "faculty": {
                "bsonType": "string",
                "minLength": 1,
                "description": "Required. Must be a non-empty string (e.g. 'Science', 'Engineering')."
            },
            "major": {
                "bsonType": "string",
                "minLength": 1,
                "description": "Primary field of study."
            },
            "minor": {
                "bsonType": ["string", "null"],
                "description": "Optional secondary field of study."
            },
            "clubs": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
                "description": "List of club/activity names."
            },
            "experience": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["position", "company"],
                    "properties": {
                        "position":   {"bsonType": "string"},
                        "company":    {"bsonType": "string"},
                        "start_date": {"bsonType": ["string", "null"]},
                        "end_date":   {"bsonType": ["string", "null"]},
                        "location":   {"bsonType": ["string", "null"]},
                        "industries": {
                            "bsonType": "array",
                            "items": {"bsonType": "string"}
                        }
                    }
                },
                "description": "Work / internship history."
            },
            "socials": {
                "bsonType": "object",
                "description": "Social links (linkedinUrl, other)."
            },
            "preferred_work_place": {
                "bsonType": ["string", "null"],
                "description": "Preferred work location."
            },
            "password": {
                "bsonType": ["string", "null"],
                "description": "Werkzeug-hashed password."
            },
            "token": {
                "bsonType": ["string", "null"],
                "description": "Auth token (hex)."
            },
            "connectionStrength": {
                "bsonType": "array",
                "description": "Top-N pre-computed similarity scores cache."
            }
        }
    }
}

# ─── Connections Collection Schema ────────────────────────────────────────────

CONNECTIONS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["source", "target", "strength"],
        "properties": {
            "source": {
                "bsonType": "string",
                "description": "Source user _id (as string)."
            },
            "target": {
                "bsonType": "string",
                "description": "Target user _id (as string)."
            },
            "strength": {
                "bsonType": ["double", "int"],
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Similarity score [0.0, 1.0]."
            },
            "type": {
                "bsonType": "string",
                "enum": ["direct", "indirect", "fuzzy"],
                "description": "Connection tier."
            },
            "status": {
                "bsonType": "string",
                "enum": ["accepted", "pending", "rejected"],
                "description": "Connection request status."
            }
        }
    }
}


def apply_schema(db):
    """
    Apply JSON Schema validation to `users` and `connections` collections.
    Creates the collections if they do not exist yet.
    Uses 'warn' validationAction so legacy documents don't cause hard write errors.
    """
    existing = db.list_collection_names()

    for name, schema in [("users", USERS_SCHEMA), ("connections", CONNECTIONS_SCHEMA)]:
        if name not in existing:
            db.create_collection(name, validator={"$jsonSchema": schema["$jsonSchema"]},
                                 validationAction="warn")
            logger.info(f"[db_schema] Created collection '{name}' with JSON Schema validation.")
        else:
            try:
                db.command("collMod", name,
                           validator={"$jsonSchema": schema["$jsonSchema"]},
                           validationAction="warn",
                           validationLevel="moderate")
                logger.info(f"[db_schema] Updated schema on existing collection '{name}'.")
            except Exception as e:
                logger.warning(f"[db_schema] Could not update schema for '{name}': {e}")


def apply_indexes(db):
    """
    Create performance indexes for the `users` and `connections` collections.
    All calls are idempotent — MongoDB ignores duplicate createIndex requests.
    """
    users = db.users

    # Unique email — also used as the primary lookup key for login
    users.create_index("email", unique=True, name="email_unique")

    # Full-name text search support (compound first+last)
    users.create_index(
        [("firstName", "text"), ("lastName", "text"),
         ("major", "text"), ("faculty", "text"),
         ("clubs", "text"), ("experience.position", "text"), ("experience.company", "text")],
        name="users_text_search",
        weights={
            "firstName": 10,
            "lastName": 10,
            "major": 5,
            "faculty": 4,
            "experience.position": 3,
            "experience.company": 2,
            "clubs": 2,
        }
    )

    # Regex-friendly single-field indexes (used by search_service.py `$regex` queries)
    users.create_index("major",              name="major_idx")
    users.create_index("faculty",            name="faculty_idx")
    users.create_index("clubs",              name="clubs_idx")
    users.create_index("experience.position", name="exp_position_idx")
    users.create_index("experience.company",  name="exp_company_idx")
    users.create_index("graduationYear",      name="graduation_year_idx")
    users.create_index("token",               name="token_idx")   # Used by auth middleware

    # Connections
    connections = db.connections
    connections.create_index([("source", 1), ("target", 1)], unique=True, name="connection_pair_unique")
    connections.create_index("source",   name="connection_source_idx")
    connections.create_index("target",   name="connection_target_idx")
    connections.create_index("strength", name="connection_strength_idx")

    logger.info("[db_schema] All indexes applied successfully.")


def setup_db(db):
    """
    One-call entrypoint: apply schema validation then create indexes.
    Call this once on app startup after obtaining the db handle.
    """
    try:
        apply_schema(db)
    except Exception as e:
        logger.error(f"[db_schema] Schema application failed: {e}")

    try:
        apply_indexes(db)
    except Exception as e:
        logger.error(f"[db_schema] Index creation failed: {e}")
