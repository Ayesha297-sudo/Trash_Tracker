from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =====================================================================
# 1. DATABASE CONNECTION STRING
# =====================================================================
# Defines the exact location and credentials for the database connection.
# Format: dialect+driver://username:password@host/database_name
# - "mysql+pymysql": Specifies MySQL as the database and PyMySQL as the driver.
# - "root:@": The default XAMPP credentials (username 'root', empty password).
# - "localhost": Indicates the database server is hosted locally.
# - "trash_tracker_db": The target database name.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/trash_tracker_db"

# =====================================================================
# 2. SQLALCHEMY ENGINE INITIALIZATION
# =====================================================================
# The Engine is the core interface to the database. 
# It establishes and manages the connection pool and underlying DBAPI.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# =====================================================================
# 3. SESSION FACTORY CONFIGURATION
# =====================================================================
# Creates a configured "SessionLocal" class. 
# Instances of this class will handle individual database transactions.
# - autocommit=False: Ensures data is explicitly committed to avoid accidental saves.
# - autoflush=False: Prevents automatic flushing of pending queries before execution.
# - bind=engine: Associates the session factory with our initialized engine.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# =====================================================================
# 4. DECLARATIVE BASE CLASS
# =====================================================================
# Constructs a base class for the SQLAlchemy declarative extension.
# All ORM models (database tables) in the application will inherit from this Base.
Base = declarative_base()