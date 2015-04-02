#!/bin/bash  
read -p "Commit description: " desc 

current_time=$(date "+%Y.%m.%d-%H:%M:%S")
echo [$current_time] - $desc >> updateLog.log

git add .  
git commit -m "$desc" 
git push origin master

echo "----------------------------------------"
echo "Git repository updated @ $current_time"
echo "----------------------------------------"