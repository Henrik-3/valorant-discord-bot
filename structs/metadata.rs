use std::collections::HashMap;
use std::iter::IntoIterator;
use std::sync::LazyLock;
use chrono::{DateTime, Utc};


pub static AGENT_RELEASE_VERSIONS: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(
    || {
        let mut m = HashMap::new();
        m.insert("9f0d8ba9-4140-b941-57d3-a7ad57c6b417", "v0.0"); //Brimstone
        m.insert("707eab51-4836-f488-046a-cda6bf494859", "v0.0"); //Viper
        m.insert("8e253930-4c05-31dd-1b6c-968525494517", "v0.0"); //Omen
        m.insert("117ed9e3-49f3-6512-3ccf-0cada7e3823b", "v0.0"); //Cypher
        m.insert("320b2a48-4d9b-a075-30f1-1f93a9b638fa", "v0.0"); //Sova
        m.insert("569fdd95-4d10-43ab-ca70-79becc718b46", "v0.0"); //Sage
        m.insert("eb93336a-449b-9c1b-0a54-a891f7921d69", "v0.0"); //Phoenix
        m.insert("add6443a-41bd-e414-f6ad-e58d267f4e95", "v0.0"); //Jett
        m.insert("f94c3b30-42be-e959-889c-5aa313dba261", "v0.0"); //Raze
        m.insert("5f8d3a7f-467b-97f3-062c-13acf203c006", "v0.0"); //Breach
        m.insert("a3bfb853-43b2-7238-a4f1-ad90e9e46bcc", "v1.0"); //Reyna
        m.insert("1e58de9c-4950-5125-93e9-a0aee9f98746", "v1.05"); //Killjoy
        m.insert("6f2a04ca-43e0-be17-7f36-b3908627744d", "v1.11"); //Skye
        m.insert("7f94d92c-4234-0a36-9646-3a87eb8b5c89", "v2.0"); //Yoru
        m.insert("41fb69c1-4189-7b37-f117-bcaf1e96f1bf", "v2.04"); //Astra
        m.insert("601dbbe7-43ce-be57-2a40-4abd24953621", "v3.0"); //KAY/O
        m.insert("37ab3994-43e0-c9e1-219e-b5a0723a4d17", "v3.10"); //Chamber
        m.insert("bb2a4828-46eb-8cd1-e765-15848195d751", "v4.0"); //Neon
        m.insert("dade69b4-4f5a-8528-247b-219e5a1facd6", "v4.08"); //Fade
        m.insert("95b78ed7-4637-86d9-7e41-71ba8c293152", "v5.08"); //Harbor
        m.insert("e370fa57-4757-3604-3648-499e1f642d3f", "v6.04"); //Gekko
        m.insert("cc8b64c8-4b25-4ff9-6e7f-37b4da43d235", "v7.0"); //Deadlock
        m.insert("0e38b510-41a8-5780-5e8f-568b2a4f2d6c", "v7.09"); //ISO
        m.insert("1dbf2edd-4729-0984-3115-daa5eed44993", "v8.05"); //Clove
        m.insert("efba5359-4016-a1e5-7626-b1ae76895940", "v9.04"); //Vyse
        m
    }
);