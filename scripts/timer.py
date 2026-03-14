#!/usr/bin/env python3
import json
import os
import sys
import time

TIMER_DIR = "/tmp/workaholic_timers"

def get_timer_file(session_id):
    os.makedirs(TIMER_DIR, exist_ok=True)
    return os.path.join(TIMER_DIR, f"{session_id}.json")

def load_timer(session_id):
    timer_file = get_timer_file(session_id)
    if os.path.exists(timer_file):
        with open(timer_file, "r") as f:
            return json.load(f)
    return None

def save_timer(data, session_id):
    timer_file = get_timer_file(session_id)
    with open(timer_file, "w") as f:
        json.dump(data, f)

def start(seconds, session_id):
    data = {
        "start_time": time.time(),
        "min_duration": seconds,
        "started": True,
        "session_id": session_id
    }
    save_timer(data, session_id)
    print(f"Timer started: {seconds}s, session: {session_id}")

def status(session_id):
    data = load_timer(session_id)
    if not data or not data.get("started"):
        print(f"Timer not started (session: {session_id})")
        return
    
    elapsed = time.time() - data["start_time"]
    remaining = max(0, data["min_duration"] - elapsed)
    can_end = elapsed >= data["min_duration"]
    
    print(f"Session: {session_id}")
    print(f"  Min: {data['min_duration']}s, Elapsed: {elapsed:.1f}s, Remaining: {remaining:.1f}s")
    print(f"  Can end: {'YES' if can_end else 'NO'}")

def can_end(session_id):
    data = load_timer(session_id)
    if not data or not data.get("started"):
        print("1")
        return
    
    elapsed = time.time() - data["start_time"]
    print("1" if elapsed >= data["min_duration"] else "0")

def remaining(session_id):
    data = load_timer(session_id)
    if not data or not data.get("started"):
        print("0")
        return
    
    elapsed = time.time() - data["start_time"]
    print(max(0, int(data["min_duration"] - elapsed)))

def stop(session_id):
    timer_file = get_timer_file(session_id)
    if os.path.exists(timer_file):
        os.remove(timer_file)
    print(f"Timer stopped (session: {session_id})")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        if len(sys.argv) < 3:
            print("Usage: timer.py start <seconds> [session_id]")
            sys.exit(1)
        try:
            seconds = int(sys.argv[2])
            session_id = sys.argv[3] if len(sys.argv) > 3 else "default"
            start(seconds, session_id)
        except ValueError:
            print("Duration must be an integer")
            sys.exit(1)
    else:
        session_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        
        if command == "status":
            status(session_id)
        elif command == "can-end":
            can_end(session_id)
        elif command == "remaining":
            remaining(session_id)
        elif command == "stop":
            stop(session_id)
        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

if __name__ == "__main__":
    main()
