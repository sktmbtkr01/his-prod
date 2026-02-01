#!/bin/bash
set -e

echo "============================================"
echo "   HIS Backend - Starting Services"
echo "============================================"

# Create log directory
mkdir -p /var/log/supervisor

# Wait for any slow dependencies
sleep 2

echo "Starting Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
