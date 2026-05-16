# 社員CSV取込フォーマット

社員管理画面で評価期を選択し、「CSV取込」から、その評価期の社員所属情報を一括登録できます。

社員番号 `employee_code` が既に存在する場合は社員マスタと選択中評価期の所属を更新し、存在しない場合は社員と選択中評価期の所属を新規作成します。別年度の所属履歴は更新しません。

## フォーマット

文字コードは UTF-8、区切り文字はカンマです。ヘッダー行は必須です。

```csv
employee_code,name,email,is_active,organization_name,grade,grade_type,position,employee_type,roles,manager_employee_code,division_manager_employee_code,executive_employee_code,valid_from,valid_to
60001,山田太郎,yamada@example.com,true,営業部,3,STANDARD,スタッフ,REGULAR,MEMBER,30001,30001,,2025-09-01,
30001,営業部長,manager@example.com,true,営業部,5,STANDARD,部長,REGULAR,MANAGER,,,,2025-09-01,
```

| 列名 | 必須 | 内容 |
| ---- | ---- | ---- |
| `employee_code` | 必須 | 社員番号。CSV内で一意にしてください。 |
| `name` | 必須 | 氏名 |
| `email` | 必須 | メールアドレス。CSV内で一意にしてください。 |
| `is_active` | 任意 | `true` / `false`。空欄は `true` として扱います。 |
| `organization_name` | 必須 | 所属先組織名。選択中の評価期の組織管理で事前登録してください。 |
| `grade` | 必須 | 等級。1〜9 の整数 |
| `grade_type` | 必須 | 等級種別。例: `STANDARD` |
| `position` | 必須 | 役職 |
| `employee_type` | 必須 | `REGULAR` / `CONTRACT` / `ASSISTANT` |
| `roles` | 必須 | `ADMIN` / `HR` / `MANAGER` / `TEAM_LEADER` / `MEMBER`。複数指定は `MEMBER;TEAM_LEADER` のようにセミコロン区切り。 |
| `manager_employee_code` | 任意 | 直属上長の社員番号 |
| `division_manager_employee_code` | 任意 | 事業部長の社員番号 |
| `executive_employee_code` | 任意 | 役員の社員番号 |
| `valid_from` | 必須 | 所属開始日。`YYYY-MM-DD` |
| `valid_to` | 任意 | 所属終了日。`YYYY-MM-DD` |

評価者の社員番号は、既存社員または同じCSV内の社員を指定できます。

互換用に `evaluation_period_name` 列が含まれている場合は、選択中の評価期名と一致するか検証します。
