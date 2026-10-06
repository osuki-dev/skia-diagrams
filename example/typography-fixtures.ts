/** Long, publishable specimens for native font and table padding verification. */
export const typographyFixtures = {
  Class: `classDiagram
class Service {
  +customerIdentifiers: List~String~
  +retentionWindowInDays: Int
  +lookupCustomerRecords(identifier): List~String~
}
<<interface>> Service
class Repository {
  +persistentConnection: String
  +saveCustomerRecords(records): void
}
Service <|-- Repository
note for Service "Host-owned fonts<br/>Members retain their measured padding<br/>No bundled typefaces"`,
  ER: `erDiagram
direction LR
ACCOUNT["Customer account<br/>Profile"] {
  string identifier PK "Unique identifier for the customer account"
  varchar display_name "Customer-facing name that remains readable when a host increases the font size"
  datetime created_at "Timestamp supplied by the application"
}
ORDER["Purchase order"] {
  string identifier PK "Unique purchase order identifier"
  string account_identifier FK "The account that owns this purchase order"
}
ACCOUNT ||--o{ ORDER : places`,
  State: `stateDiagram-v2
direction LR
[*] --> Ready
state "Awaiting customer confirmation" as Ready
state "Processing customer request" as Processing
Ready --> Processing : confirm()
Processing --> Ready : retry()
Processing --> [*] : finish()
note right of Processing
Host-owned fonts
Multiline notes remain inside their measured box
The transition stays outside the state border
end note`,
  Sequence: `sequenceDiagram
participant Client as Customer application
participant API as Persistent service
Client->>API: Find the matching customer records
activate API
note over Client,API: Host-owned fonts<br/>A multiline note remains visible<br/>at every supported font size
API-->>Client: Return the matching customer records
deactivate API`,
} as const;
