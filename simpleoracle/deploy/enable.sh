#!/bin/sh
sudo cp simpleoracle.service /etc/systemd/system/simpleoracle.service
sudo systemctl enable simpleoracle
sudo systemctl start simpleoracle
systemctl status simpleoracle
