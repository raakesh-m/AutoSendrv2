#!/bin/bash

echo "🚀 Starting AutoSendr..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    echo "💡 Run: open -a Docker"
    exit 1
fi

echo "✅ Docker is running"
echo "🔧 Starting AutoSendr full stack..."

# Build and start all services
docker-compose up --build

echo "🎉 AutoSendr is ready!"
echo "📱 Frontend: http://localhost:3000"
echo "🗄️  Database: localhost:5432" 