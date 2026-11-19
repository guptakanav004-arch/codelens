import type { LanguageId } from "@/types/review";

export interface Sample {
  id: string;
  label: string;
  language: LanguageId;
  description: string;
  code: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "python-users",
    label: "Python — user service",
    language: "python",
    description: "SQL injection, pickle, hardcoded secret, mutable default",
    code: `import os
import pickle
import sqlite3
import hashlib

API_SECRET = "sk_live_51HxExampleSecretKey"
cache = {}


def get_user(db_path, username):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # build query directly from user input
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    cur.execute(query)
    row = cur.fetchone()
    return row


def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()


def load_session(blob):
    return pickle.loads(blob)


def add_item(item, items=[]):
    items.append(item)
    return items


def find_duplicates(values):
    dupes = []
    for i in range(len(values)):
        for j in range(len(values)):
            if i != j and values[i] == values[j] and values[i] not in dupes:
                dupes.append(values[i])
    return dupes


def run_report(name):
    os.system("generate_report " + name)


def average(nums):
    return sum(nums) / len(nums)
`,
  },
  {
    id: "java-bank",
    label: "Java — account manager",
    language: "java",
    description: "Race condition, swallowed exceptions, string comparison",
    code: `import java.sql.*;
import java.util.*;

public class AccountManager {
    private Map<String, Double> balances = new HashMap<>();
    private static final String DB_PASSWORD = "admin123";

    public void deposit(String id, double amount) {
        double current = balances.get(id);
        balances.put(id, current + amount);
    }

    public boolean withdraw(String id, double amount) {
        Double current = balances.get(id);
        if (current - amount >= 0) {
            balances.put(id, current - amount);
            return true;
        }
        return false;
    }

    public ResultSet findAccount(Connection conn, String owner) throws SQLException {
        Statement st = conn.createStatement();
        return st.executeQuery("SELECT * FROM accounts WHERE owner = '" + owner + "'");
    }

    public boolean isAdmin(String role) {
        return role == "admin";
    }

    public void export(String path) {
        try {
            java.io.FileWriter w = new java.io.FileWriter(path);
            for (String k : balances.keySet()) {
                w.write(k + "," + balances.get(k) + "\\n");
            }
        } catch (Exception e) {
        }
    }
}
`,
  },
  {
    id: "cpp-buffer",
    label: "C++ — buffer handling",
    language: "cpp",
    description: "Buffer overflow, memory leak, unchecked allocation",
    code: `#include <iostream>
#include <cstring>
#include <cstdlib>
#include <vector>
using namespace std;

struct Record {
    char name[16];
    int score;
};

Record* make_record(const char* name, int score) {
    Record* r = (Record*)malloc(sizeof(Record));
    strcpy(r->name, name);
    r->score = score;
    return r;
}

int sum_scores(vector<Record*> records) {
    int total = 0;
    for (int i = 0; i <= records.size(); i++) {
        total += records[i]->score;
    }
    return total;
}

void read_input() {
    char buf[32];
    cout << "Enter name: ";
    gets(buf);
    cout << "Hello " << buf << endl;
}

int main() {
    vector<Record*> records;
    for (int i = 0; i < 5; i++) {
        records.push_back(make_record("a very long record name here", i));
    }
    cout << sum_scores(records) << endl;
    int* data = new int[100];
    data[0] = 1;
    read_input();
    return 0;
}
`,
  },
  {
    id: "js-express",
    label: "JavaScript — Express API",
    language: "javascript",
    description: "XSS, eval, missing error handling, loose equality",
    code: `const express = require("express");
const app = express();
app.use(express.json());

const users = [];
var adminToken = "tok_admin_9f8a7b6c5d";

app.get("/search", (req, res) => {
  const q = req.query.q;
  res.send("<h1>Results for " + q + "</h1>");
});

app.post("/calc", (req, res) => {
  const result = eval(req.body.expression);
  res.json({ result });
});

app.get("/user/:id", async (req, res) => {
  const user = await fetch("http://internal/users/" + req.params.id).then((r) => r.json());
  if (user.role == "admin" && req.headers.token == adminToken) {
    res.json(user);
  }
  res.json({ name: user.name });
});

function dedupe(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (out.indexOf(list[i]) === -1) out.push(list[i]);
  }
  return out;
}

app.listen(3000);
`,
  },
];
