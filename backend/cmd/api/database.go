package main

import (
	"database/sql"
	"errors"
	"os"
	"time"

	"github.com/go-sql-driver/mysql"
)

func openDatabase() (*sql.DB, error) {
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	socket := os.Getenv("DB_SOCKET")
	address := os.Getenv("DB_ADDR")
	if user == "" && password == "" && socket == "" && address == "" {
		return nil, nil
	}
	if user == "" || password == "" || (socket == "") == (address == "") {
		return nil, errors.New("configure DB_USER, DB_PASSWORD and exactly one of DB_SOCKET or DB_ADDR")
	}

	config := mysql.NewConfig()
	config.User = user
	config.Passwd = password
	config.DBName = "education_made_assessable"
	config.Timeout = 3 * time.Second
	config.ReadTimeout = 5 * time.Second
	config.WriteTimeout = 5 * time.Second
	config.Collation = "utf8mb4_unicode_ci"
	if socket != "" {
		config.Net = "unix"
		config.Addr = socket
	} else {
		config.Net = "tcp"
		config.Addr = address
		config.TLSConfig = "true"
	}
	connector, err := mysql.NewConnector(config)
	if err != nil {
		return nil, errors.New("invalid MySQL connection configuration")
	}

	db := sql.OpenDB(connector)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(3 * time.Minute)
	return db, nil
}
