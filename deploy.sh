#!/bin/bash
set -e
APP_PATH="/opt/bitnami/projects/wsoftblog-v2"

cd $APP_PATH

# Swap directories (same blue/green pattern as wsoftlabs-website-v2's deploy.sh)
rm -rf output-old
mv output output-old 2>/dev/null || true
mv output-new output

# Restart via systemd
sudo systemctl restart wsoftblog

# Verify — port 3001 (the Nuxt site holds 3000 on this VM)
sleep 3
if curl -fsS http://localhost:3001 > /dev/null; then
    echo "Deploy successful!"
    rm -rf output-old
    exit 0
fi

# Rollback
echo "Deploy failed! Rolling back..."
rm -rf output-failed
mv output output-failed
mv output-old output
sudo systemctl restart wsoftblog
echo "Rolled back. Check logs: sudo journalctl -u wsoftblog -n 100"
exit 1
