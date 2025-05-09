#!/bin/bash
cd ~/angular-projekt/backend
npm run dev &
cd ~/angular-projekt/frontend
ng serve --host 0.0.0.0
