/** Generated from Mermaid 12.1.0 official docs at 97b345154f2cd71f23a2aadb14af6dad46f63173.
 * Run bun scripts/sync-official-fixtures.ts to update; preserve source exactly. */
export const officialCatalog = {
  version: "12.1.0",
  revision: "97b345154f2cd71f23a2aadb14af6dad46f63173",
  types: [
    {
      type: "flowchart",
      name: "Flowchart",
      documentation: "https://mermaid.js.org/syntax/flowchart.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/flowchart.md",
      cases: [
        {
          id: "flowchart/001",
          title: "A node (default)",
          source: "---\ntitle: Node\n---\nflowchart LR\n    id\n",
          sha256: "ff9a1774bb7e9a416e6000ff507393b371cfb18e9dc361858312b223c212c5e7",
          cjk: false,
        },
        {
          id: "flowchart/002",
          title: "A node with text",
          source:
            "---\ntitle: Node with text\n---\nflowchart LR\n    id1[This is the text in the box]\n",
          sha256: "f4db835df6afe3f2a60fd530d101e862e7adee3fb9a13cbd63bb06fceb16af18",
          cjk: false,
        },
        {
          id: "flowchart/003",
          title: "Unicode text",
          source: 'flowchart LR\n    id["This ❤ Unicode"]\n',
          sha256: "f70aed641f746c2aebf1f7a38e066d04146a92ffc9d780b97e0de7ba298edd0a",
          cjk: false,
        },
        {
          id: "flowchart/004",
          title: "Markdown formatting",
          source:
            '---\nconfig:\n  htmlLabels: false\n---\nflowchart LR\n    markdown["`This **is** _Markdown_`"]\n    newLines["`Line1\n    Line 2\n    Line 3`"]\n    markdown --> newLines\n',
          sha256: "c73fdea4fca45502e808258502bf60c5400ce0c011e1976893bfaeaaab82a236",
          cjk: false,
        },
        {
          id: "flowchart/005",
          title: "Direction",
          source: "flowchart TD\n    Start --> Stop\n",
          sha256: "6686c2010c31ba664f0e247782e2ae54cae2e4d8e38e963d62c7680ec88d679b",
          cjk: false,
        },
        {
          id: "flowchart/006",
          title: "Direction",
          source: "flowchart LR\n    Start --> Stop\n",
          sha256: "9221e419f59c0a81f59b17b5c407c5428062220007821d680d51a7e94ed896d2",
          cjk: false,
        },
        {
          id: "flowchart/007",
          title: "With the defaults",
          source:
            "flowchart LR\n  subgraph Client\n    UI[Web app]\n    Cache[(Local cache)]\n  end\n  subgraph Services\n    API[API gateway]\n    Auth[Auth service]\n    Orders[Order service]\n  end\n  subgraph Storage\n    DB[(Orders DB)]\n  end\n  UI --> API\n  UI --> Cache\n  API --> Auth\n  API --> Orders\n  Orders --> DB\n  Auth -. token .-> UI\n",
          sha256: "db4aa3083cae19b2161f65a3286ca21bd0af2272991be4d9b363418ce69e51ed",
          cjk: false,
        },
        {
          id: "flowchart/008",
          title: "The previous appearance",
          source:
            "---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nflowchart LR\n  subgraph Client\n    UI[Web app]\n    Cache[(Local cache)]\n  end\n  subgraph Services\n    API[API gateway]\n    Auth[Auth service]\n    Orders[Order service]\n  end\n  subgraph Storage\n    DB[(Orders DB)]\n  end\n  UI --> API\n  UI --> Cache\n  API --> Auth\n  API --> Orders\n  Orders --> DB\n  Auth -. token .-> UI\n",
          sha256: "80b86f15a9c2e222a8366525c34dafb71e4ed8f6cdb146c66a55c3981a79d62b",
          cjk: false,
        },
        {
          id: "flowchart/009",
          title: "A node with round edges",
          source: "flowchart LR\n    id1(This is the text in the box)\n",
          sha256: "c8329226c7005848bc01f044b331651af1816ba5b0eb684077367fce0a6dd865",
          cjk: false,
        },
        {
          id: "flowchart/010",
          title: "A stadium-shaped node",
          source: "flowchart LR\n    id1([This is the text in the box])\n",
          sha256: "848620f02e99e05d2fe361f5eef1e854b13698013e16343fa42b1394084de642",
          cjk: false,
        },
        {
          id: "flowchart/011",
          title: "A node in a subroutine shape",
          source: "flowchart LR\n    id1[[This is the text in the box]]\n",
          sha256: "fe5831e2389554d0432c3aa175192ce8bbbb68d50bc560e5d4680d46c15da29e",
          cjk: false,
        },
        {
          id: "flowchart/012",
          title: "A node in a cylindrical shape",
          source: "flowchart LR\n    id1[(Database)]\n",
          sha256: "c57732f4dea61398cb6c155278fad30ffdcb7d0352c868e953faccdb8819165f",
          cjk: false,
        },
        {
          id: "flowchart/013",
          title: "A node in the form of a circle",
          source: "flowchart LR\n    id1((This is the text in the circle))\n",
          sha256: "6b39e85e8e60c32e26828a88f371aec36e36c785f3707ebf329d9944cf99c6ea",
          cjk: false,
        },
        {
          id: "flowchart/014",
          title: "A node in an asymmetric shape",
          source: "flowchart LR\n    id1>This is the text in the box]\n",
          sha256: "bb15e35a39985eb4955b6388147487cb703e8ff0f89598c3ab24b0696ae3e013",
          cjk: false,
        },
        {
          id: "flowchart/015",
          title: "A node (rhombus)",
          source: "flowchart LR\n    id1{This is the text in the box}\n",
          sha256: "306e952eea6e380b7151bb3080c68cf152ddd33e9bbf193f7b2949da5dce4f21",
          cjk: false,
        },
        {
          id: "flowchart/016",
          title: "A hexagon node",
          source: "flowchart LR\n    id1{{This is the text in the box}}\n",
          sha256: "dcf721a3f4beee6490c5c50061185b5458758c3303934b0c99908ee95294510f",
          cjk: false,
        },
        {
          id: "flowchart/017",
          title: "Parallelogram",
          source: "flowchart TD\n    id1[/This is the text in the box/]\n",
          sha256: "832a1ec82f995ef815217f1ddf1f6153f4ae399207d72474b0426123dafcbaad",
          cjk: false,
        },
        {
          id: "flowchart/018",
          title: "Parallelogram alt",
          source: "flowchart TD\n    id1[\\This is the text in the box\\]\n",
          sha256: "a51d852be5d3bbed2c1ea3c8d49a9e54a87626a3396792c8152b7a43abdc4fd9",
          cjk: false,
        },
        {
          id: "flowchart/019",
          title: "Trapezoid",
          source: "flowchart TD\n    A[/Christmas\\]\n",
          sha256: "6b1ad0dda6c60babeafbd86fc402843bb05dcb6b9ae173cdcc65ed14e09131f7",
          cjk: false,
        },
        {
          id: "flowchart/020",
          title: "Trapezoid alt",
          source: "flowchart TD\n    B[\\Go shopping/]\n",
          sha256: "2f0bf28294a31aec33fb8c3f3e535cfd4f0ada177b5e7b82bfde326c98d0fa84",
          cjk: false,
        },
        {
          id: "flowchart/021",
          title: "Double circle",
          source: "flowchart TD\n    id1(((This is the text in the circle)))\n",
          sha256: "2d81e8b9d03f23eda48228bac3d290bc7919b7a7c12a1be958d68dd109770a83",
          cjk: false,
        },
        {
          id: "flowchart/022",
          title: "Example Flowchart with New Shapes",
          source:
            'flowchart RL\n    A@{ shape: manual-file, label: "File Handling"}\n    B@{ shape: manual-input, label: "User Input"}\n    C@{ shape: docs, label: "Multiple Documents"}\n    D@{ shape: procs, label: "Process Automation"}\n    E@{ shape: paper-tape, label: "Paper Records"}\n',
          sha256: "8f6bee2432ba9b4bf727422dd4e8815ce6d0350801064afc01aecf6fee5080d5",
          cjk: false,
        },
        {
          id: "flowchart/023",
          title: "Process",
          source: 'flowchart TD\n    A@{ shape: rect, label: "This is a process" }\n',
          sha256: "cfb3b33ba4ec000c24822eb5562131b6e37e3d0946ec3a47b2ce4853ca0db09d",
          cjk: false,
        },
        {
          id: "flowchart/024",
          title: "Event",
          source: 'flowchart TD\n    A@{ shape: rounded, label: "This is an event" }\n',
          sha256: "520a982ac547b0840707c14c20068df2fc719c16ee21a8c930c00667a134ba22",
          cjk: false,
        },
        {
          id: "flowchart/025",
          title: "Terminal Point (Stadium)",
          source: 'flowchart TD\n    A@{ shape: stadium, label: "Terminal point" }\n',
          sha256: "26d721957df8d7a3b504b4281f53d881ab6bf046921049386059e1dd956825c1",
          cjk: false,
        },
        {
          id: "flowchart/026",
          title: "Subprocess",
          source: 'flowchart TD\n    A@{ shape: subproc, label: "This is a subprocess" }\n',
          sha256: "4a2ae373f0d2498d16c513a177166ec9be260e878cb1eed3fdfdaa6fdc57da42",
          cjk: false,
        },
        {
          id: "flowchart/027",
          title: "Database (Cylinder)",
          source: 'flowchart TD\n    A@{ shape: cyl, label: "Database" }\n',
          sha256: "c63dbcd17538c2add1d37300ef278ebcfacdbad7f4de23393f0540a5c3337017",
          cjk: false,
        },
        {
          id: "flowchart/028",
          title: "Start (Circle)",
          source: 'flowchart TD\n    A@{ shape: circle, label: "Start" }\n',
          sha256: "7b261343fbfaf30853f7a41587cb93a8ecdfbd61c785556ad6ba9e5323dd4006",
          cjk: false,
        },
        {
          id: "flowchart/029",
          title: "Odd",
          source: 'flowchart TD\n    A@{ shape: odd, label: "Odd shape" }\n',
          sha256: "a4bed0a9c19df28f7c57ad7920f22831ecaff02f241aca2280553f5d3b44bc3b",
          cjk: false,
        },
        {
          id: "flowchart/030",
          title: "Decision (Diamond)",
          source: 'flowchart TD\n    A@{ shape: diamond, label: "Decision" }\n',
          sha256: "753ca710b1ac1dee956daf8346d139c30bd489c20524a639e645e30bc31be0ee",
          cjk: false,
        },
        {
          id: "flowchart/031",
          title: "Prepare Conditional (Hexagon)",
          source: 'flowchart TD\n    A@{ shape: hex, label: "Prepare conditional" }\n',
          sha256: "6f8583b8b0e2f07e5c75e56cd20048ebfb3c606c9ddad7eca118e1382512f986",
          cjk: false,
        },
        {
          id: "flowchart/032",
          title: "Data Input/Output (Lean Right)",
          source: 'flowchart TD\n    A@{ shape: lean-r, label: "Input/Output" }\n',
          sha256: "b920fc09d3e79f52dc21fbea9c349ccdd5e7d2ee696587ed642270e4f1002907",
          cjk: false,
        },
        {
          id: "flowchart/033",
          title: "Data Input/Output (Lean Left)",
          source: 'flowchart TD\n    A@{ shape: lean-l, label: "Output/Input" }\n',
          sha256: "89a471241f408285176cf1b90913243070991a8b176a1d27ef261dc124c0567c",
          cjk: false,
        },
        {
          id: "flowchart/034",
          title: "Datastore (Top and bottom border)",
          source: 'flowchart TD\n    A@{ shape: datastore, label: "Datastore" }\n',
          sha256: "d47a9e81b902e765165b940a0486faeb3eebcccc3195004d17dfc99303d9cc35",
          cjk: false,
        },
        {
          id: "flowchart/035",
          title: "Priority Action (Trapezoid Base Bottom)",
          source: 'flowchart TD\n    A@{ shape: trap-b, label: "Priority action" }\n',
          sha256: "b153dad4f8ca0655819c5aa794e7f324f3d3a3ebd0a36788283047fa8bc76af9",
          cjk: false,
        },
        {
          id: "flowchart/036",
          title: "Manual Operation (Trapezoid Base Top)",
          source: 'flowchart TD\n    A@{ shape: trap-t, label: "Manual operation" }\n',
          sha256: "de84549bf410270ef303779dccd84a295c46c2a0b8898dbad94fcfc4db8a3549",
          cjk: false,
        },
        {
          id: "flowchart/037",
          title: "Stop (Double Circle)",
          source: 'flowchart TD\n    A@{ shape: dbl-circ, label: "Stop" }\n',
          sha256: "a60f1b1f561afa1f461cd65b338b998ced96f87ee344d3d0e867e03c9cc5d144",
          cjk: false,
        },
        {
          id: "flowchart/038",
          title: "Text Block",
          source: 'flowchart TD\n    A@{ shape: text, label: "This is a text block" }\n',
          sha256: "82e0f657dc5d85d7641127555f25ab5dd67775745e1084c643dd821ab0557f88",
          cjk: false,
        },
        {
          id: "flowchart/039",
          title: "Card (Notched Rectangle)",
          source: 'flowchart TD\n    A@{ shape: notch-rect, label: "Card" }\n',
          sha256: "85b0a8dd09d11b3b226ccb8640abd714cf9d2297079df1962bc511c2cd9d5dbc",
          cjk: false,
        },
        {
          id: "flowchart/040",
          title: "Lined/Shaded Process",
          source: 'flowchart TD\n    A@{ shape: lin-rect, label: "Lined process" }\n',
          sha256: "50674ff2e8365bec378ab6a1b97f06cfa490f0b2cba07aabf134850cba03a380",
          cjk: false,
        },
        {
          id: "flowchart/041",
          title: "Start (Small Circle)",
          source: 'flowchart TD\n    A@{ shape: sm-circ, label: "Small start" }\n',
          sha256: "eefd96427a777eb2ed495a91066259cb5e560dee1717af51f138056996ba0ccb",
          cjk: false,
        },
        {
          id: "flowchart/042",
          title: "Stop (Framed Circle)",
          source: 'flowchart TD\n    A@{ shape: framed-circle, label: "Stop" }\n',
          sha256: "839363fa35f716c99ff3ed2637fefc251e0810192cfaca557b363c87f51e7c3a",
          cjk: false,
        },
        {
          id: "flowchart/043",
          title: "Fork/Join (Long Rectangle)",
          source: 'flowchart TD\n    A@{ shape: fork, label: "Fork or Join" }\n',
          sha256: "62c7e909d6f6d2c0c1ef561c0feeecdd22f3f8593ce8ebf7ed8eb018290c2642",
          cjk: false,
        },
        {
          id: "flowchart/044",
          title: "Collate (Hourglass)",
          source: 'flowchart TD\n    A@{ shape: hourglass, label: "Collate" }\n',
          sha256: "2406ad02ae7265c8dfdda86f7f6b3df27ce6c96fbdbdf7a12285ae75c83336ea",
          cjk: false,
        },
        {
          id: "flowchart/045",
          title: "Comment (Curly Brace)",
          source: 'flowchart TD\n    A@{ shape: comment, label: "Comment" }\n',
          sha256: "bf6938b0951c8f3761f267d01c3d3b412e9b278946525ce3ce56361751d76f64",
          cjk: false,
        },
        {
          id: "flowchart/046",
          title: "Comment Right (Curly Brace Right)",
          source: 'flowchart TD\n    A@{ shape: brace-r, label: "Comment" }\n',
          sha256: "1f8f0a5158f1bd142addc783725d306758a88caa9fa25245a537b13692e6b97c",
          cjk: false,
        },
        {
          id: "flowchart/047",
          title: "Comment with braces on both sides",
          source: 'flowchart TD\n    A@{ shape: braces, label: "Comment" }\n',
          sha256: "77b6694cfcf57783226957989c9c5a29db4b51768e386b018ee53ff881aa4b8b",
          cjk: false,
        },
        {
          id: "flowchart/048",
          title: "Com Link (Lightning Bolt)",
          source: 'flowchart TD\n    A@{ shape: bolt, label: "Communication link" }\n',
          sha256: "7634b95b0a83f5a7cec825717c7ea57d7954cba2fdf1f53484f4501398efb095",
          cjk: false,
        },
        {
          id: "flowchart/049",
          title: "Document",
          source: 'flowchart TD\n    A@{ shape: doc, label: "Document" }\n',
          sha256: "a2ce1eed42a8021412c3a970341e0bd56fc3a370c4ccd8fc9ce53fbe5a98b0b3",
          cjk: false,
        },
        {
          id: "flowchart/050",
          title: "Delay (Half-Rounded Rectangle)",
          source: 'flowchart TD\n    A@{ shape: delay, label: "Delay" }\n',
          sha256: "3a814849f81b02e111839c0ee84a821bb17adc537436dd93c2681eb79d36d9cd",
          cjk: false,
        },
        {
          id: "flowchart/051",
          title: "Direct Access Storage (Horizontal Cylinder)",
          source: 'flowchart TD\n    A@{ shape: das, label: "Direct access storage" }\n',
          sha256: "ca8d8066bf48b5a3624b2d4ddc31e1eae9986b67e613744f936f62c04cac107d",
          cjk: false,
        },
        {
          id: "flowchart/052",
          title: "Disk Storage (Lined Cylinder)",
          source: 'flowchart TD\n    A@{ shape: lin-cyl, label: "Disk storage" }\n',
          sha256: "4638fffcd951ca6185360656c2cfc5042a0fab63520fd599b7542203bff0aaa5",
          cjk: false,
        },
        {
          id: "flowchart/053",
          title: "Display (Curved Trapezoid)",
          source: 'flowchart TD\n    A@{ shape: curv-trap, label: "Display" }\n',
          sha256: "07f75620ccb9e4d1956663b3df8e3121a391076c2e5f4e8b1b1c78bb5917e942",
          cjk: false,
        },
        {
          id: "flowchart/054",
          title: "Divided Process (Divided Rectangle)",
          source: 'flowchart TD\n    A@{ shape: div-rect, label: "Divided process" }\n',
          sha256: "06e5dd63714486cd435d11257522c619bebd37ffe5a8f89bae5aa9d20b6c064d",
          cjk: false,
        },
        {
          id: "flowchart/055",
          title: "Extract (Small Triangle)",
          source: 'flowchart TD\n    A@{ shape: tri, label: "Extract" }\n',
          sha256: "9fde480c3c89b38861413d920306d4bc2debd487f1841db536f688e22f3c236c",
          cjk: false,
        },
        {
          id: "flowchart/056",
          title: "Internal Storage (Window Pane)",
          source: 'flowchart TD\n    A@{ shape: win-pane, label: "Internal storage" }\n',
          sha256: "9256ec4395374c5596139ebe65e752d75f3ffe114823997bcc30bf9bbaed27c1",
          cjk: false,
        },
        {
          id: "flowchart/057",
          title: "Junction (Filled Circle)",
          source: 'flowchart TD\n    A@{ shape: f-circ, label: "Junction" }\n',
          sha256: "f67ac6d593083853a634fb23614a03b12205412a34e5ff53f1b44c06b76b90f6",
          cjk: false,
        },
        {
          id: "flowchart/058",
          title: "Lined Document",
          source: 'flowchart TD\n    A@{ shape: lin-doc, label: "Lined document" }\n',
          sha256: "59f0daf6279490b4b0645d0b252a06e4712270f109e2e83e1acb05130da6c910",
          cjk: false,
        },
        {
          id: "flowchart/059",
          title: "Loop Limit (Notched Pentagon)",
          source: 'flowchart TD\n    A@{ shape: notch-pent, label: "Loop limit" }\n',
          sha256: "8106d06596bb16c0d36ffb96646c28d9eacd3639a7e5889e86fdad1f83eaaefe",
          cjk: false,
        },
        {
          id: "flowchart/060",
          title: "Manual File (Flipped Triangle)",
          source: 'flowchart TD\n    A@{ shape: flip-tri, label: "Manual file" }\n',
          sha256: "df37b14d183fcdc5e8d504de7dd7e7b875db1f03bf64fa2017e9f7f466bc7de6",
          cjk: false,
        },
        {
          id: "flowchart/061",
          title: "Manual Input (Sloped Rectangle)",
          source: 'flowchart TD\n    A@{ shape: sl-rect, label: "Manual input" }\n',
          sha256: "b595757319467b198000965024c82d13fa2a3777fc52e024774cc373f0da33c6",
          cjk: false,
        },
        {
          id: "flowchart/062",
          title: "Multi-Document (Stacked Document)",
          source: 'flowchart TD\n    A@{ shape: docs, label: "Multiple documents" }\n',
          sha256: "12a1109775b51abe9582708167b4aabcd5e83581a9008530bb39d6037ceeef25",
          cjk: false,
        },
        {
          id: "flowchart/063",
          title: "Multi-Process (Stacked Rectangle)",
          source: 'flowchart TD\n    A@{ shape: processes, label: "Multiple processes" }\n',
          sha256: "4a6522e28377d094e67d40e73c0900d799583c4b841a328ed012bc5ffb4730ad",
          cjk: false,
        },
        {
          id: "flowchart/064",
          title: "Paper Tape (Flag)",
          source: 'flowchart TD\n    A@{ shape: flag, label: "Paper tape" }\n',
          sha256: "12232e66b8e521b29b369a84fb28498f48e80b6a34bdb98537d67990656dac3a",
          cjk: false,
        },
        {
          id: "flowchart/065",
          title: "Stored Data (Bow Tie Rectangle)",
          source: 'flowchart TD\n    A@{ shape: bow-rect, label: "Stored data" }\n',
          sha256: "022e2327ceeaa8cf53ebd6a72f1ef3224639e61c3e490f75598525a1ced45dc2",
          cjk: false,
        },
        {
          id: "flowchart/066",
          title: "Summary (Crossed Circle)",
          source: 'flowchart TD\n    A@{ shape: cross-circ, label: "Summary" }\n',
          sha256: "4dc7b8e96f70cc6cfa00a234b739f8bf0a1d553028f4a03c6aa3eba560e005dd",
          cjk: false,
        },
        {
          id: "flowchart/067",
          title: "Tagged Document",
          source: 'flowchart TD\n    A@{ shape: tag-doc, label: "Tagged document" }\n',
          sha256: "d42a5304c164faa64cbc7569708ee209afc885db4e36e2c79c6ad4690cb0e7df",
          cjk: false,
        },
        {
          id: "flowchart/068",
          title: "Tagged Process (Tagged Rectangle)",
          source: 'flowchart TD\n    A@{ shape: tag-rect, label: "Tagged process" }\n',
          sha256: "d6fe1124605992832169620072fcd28f601f1b43a8633aba67a88d9dc9b2c7fa",
          cjk: false,
        },
        {
          id: "flowchart/069",
          title: "Icon Shape",
          source:
            'flowchart TD\n    A@{ icon: "fa:user", form: "square", label: "User Icon", pos: "t", h: 60 }\n',
          sha256: "302d8d0973b8d245d454a7bb87c4dec4ce1dd784ca2e7675ceaaf432230d07f6",
          cjk: false,
        },
        {
          id: "flowchart/070",
          title: "Parameters",
          source:
            'flowchart TD\n  %% My image with a constrained aspect ratio\n  A@{ img: "https://mermaid.js.org/favicon.svg", label: "My example image label", pos: "t", h: 60, constraint: "on" }\n',
          sha256: "9a39031c41fcb0e669e341b2100124e9ce9d8d98370e92022f62b0e972f8e4bd",
          cjk: false,
        },
        {
          id: "flowchart/071",
          title: "A link with arrow head",
          source: "flowchart LR\n    A-->B\n",
          sha256: "85a2f8b3229ec602dc46b93885a70c09a6552bdeccb80078f6ca1e453100de57",
          cjk: false,
        },
        {
          id: "flowchart/072",
          title: "An open link",
          source: "flowchart LR\n    A --- B\n",
          sha256: "9733d593d7c58fd476fc1d9669504583efa270cc4823a54eecca11ffd03d4db3",
          cjk: false,
        },
        {
          id: "flowchart/073",
          title: "Text on links",
          source: "flowchart LR\n    A-- This is the text! ---B\n",
          sha256: "39f13d6306c2997c8eb616817de35c8dff00291d710ae1ee102d14ee0ec9215d",
          cjk: false,
        },
        {
          id: "flowchart/074",
          title: "Text on links",
          source: "flowchart LR\n    A---|This is the text|B\n",
          sha256: "d2f58af55ba28028d53e33fa57ecac2b12a8dad76f3e4835459f7d20d93bbacd",
          cjk: false,
        },
        {
          id: "flowchart/075",
          title: "A link with arrow head and text",
          source: "flowchart LR\n    A-->|text|B\n",
          sha256: "d5d4d42882dee089aa7bba6a677667b879ee4d5f8402f3a04030b3aaaf61d0b8",
          cjk: false,
        },
        {
          id: "flowchart/076",
          title: "A link with arrow head and text",
          source: "flowchart LR\n    A-- text -->B\n",
          sha256: "6a86b6e0b7cb8bb5487da17d90f75cb40220b235fed604053caef5173f7e913b",
          cjk: false,
        },
        {
          id: "flowchart/077",
          title: "Dotted link",
          source: "flowchart LR\n   A-.->B;\n",
          sha256: "1bb084024e89e351488468f8e7240fa2cdc8a70a846adbd8725aa7961791f18d",
          cjk: false,
        },
        {
          id: "flowchart/078",
          title: "Dotted link with text",
          source: "flowchart LR\n   A-. text .-> B\n",
          sha256: "3dcfb621c76053c48e4e136136a71cbd0d07c11e1a302dd5570328a328f14ab4",
          cjk: false,
        },
        {
          id: "flowchart/079",
          title: "Thick link",
          source: "flowchart LR\n   A ==> B\n",
          sha256: "2b838b9975e215d252cbf950b5922529cd1afb4b6ac0ccaf097cf95b566fc134",
          cjk: false,
        },
        {
          id: "flowchart/080",
          title: "Thick link with text",
          source: "flowchart LR\n   A == text ==> B\n",
          sha256: "235e40b72637d036c0203e80116b028582952b94721b5def25b422c46f782255",
          cjk: false,
        },
        {
          id: "flowchart/081",
          title: "An invisible link",
          source: "flowchart LR\n    A ~~~ B\n",
          sha256: "30e40d14fabfa9e924f4ac0cf2fb3ae051149db61be7e4d84c13eed8a8365b88",
          cjk: false,
        },
        {
          id: "flowchart/082",
          title: "Chaining of links",
          source: "flowchart LR\n   A -- text --> B -- text2 --> C\n",
          sha256: "9806df4622bb2d0fde6e980fab0f2aa9229dae6569e94faebfddbd2ca376bee4",
          cjk: false,
        },
        {
          id: "flowchart/083",
          title: "Chaining of links",
          source: "flowchart LR\n   a --> b & c--> d\n",
          sha256: "583da5e48ac9e2cabd25423290b722cd18d087ea64ac6e0fe4ad7bd9cad875e9",
          cjk: false,
        },
        {
          id: "flowchart/084",
          title: "Chaining of links",
          source: "flowchart TB\n    A & B--> C & D\n",
          sha256: "daedeeb47874c4e5e4258244884bfa489d36f856980fff8320bebcc65406ac8d",
          cjk: false,
        },
        {
          id: "flowchart/085",
          title: "Chaining of links",
          source: "flowchart TB\n    A --> C\n    A --> D\n    B --> C\n    B --> D\n",
          sha256: "69cadca59319ddac8bfd3c631fb3cb8c9afd6c8c4376222fda27314a62114ba9",
          cjk: false,
        },
        {
          id: "flowchart/086",
          title: "Attaching an ID to Edges",
          source: "flowchart LR\n  A e1@--> B\n",
          sha256: "e1068d4490409d3cb685a8a2b77183aeddc6f723423da7a762c505f3d77ce375",
          cjk: false,
        },
        {
          id: "flowchart/087",
          title: "Turning an Animation On",
          source: "flowchart LR\n  A e1@==> B\n  e1@{ animate: true }\n",
          sha256: "fa96150719680e006a7e696777f9ebf0d06e5f65a1c8d8e5021c8645a0308afc",
          cjk: false,
        },
        {
          id: "flowchart/088",
          title: "Selecting Type of Animation",
          source: "flowchart LR\n  A e1@--> B\n  e1@{ animation: fast }\n",
          sha256: "4d814bb7de2a5933c7e49f7ab5a623140d0528f3406ca0f1e393e5757505bd2d",
          cjk: false,
        },
        {
          id: "flowchart/089",
          title: "Using classDef Statements for Animations",
          source:
            "flowchart LR\n  A e1@--> B\n  classDef animate stroke-dasharray: 9,5,stroke-dashoffset: 900,animation: dash 25s linear infinite;\n  class e1 animate\n",
          sha256: "b03ea11e4f024eb7f3b176d9dc7a5e2a363c11503302f52c63be6fc1666b15de",
          cjk: false,
        },
        {
          id: "flowchart/090",
          title: "Circle edge example",
          source: "flowchart LR\n    A --o B\n",
          sha256: "fab31634d01ab87ee5540774300b24285058d45388d84fd3f52f05be03c0ea2e",
          cjk: false,
        },
        {
          id: "flowchart/091",
          title: "Cross edge example",
          source: "flowchart LR\n    A --x B\n",
          sha256: "217131610d97964faef9d969890aee45ccf5427fadc7ae3c4d5f68cea1bfe297",
          cjk: false,
        },
        {
          id: "flowchart/092",
          title: "Multi directional arrows",
          source: "flowchart LR\n    A o--o B\n    B <--> C\n    C x--x D\n",
          sha256: "cf2bb1f7c453d5e4764b95cfcaa413d39b1a8321bd656a2dffea1792d2231bb3",
          cjk: false,
        },
        {
          id: "flowchart/093",
          title: "Minimum length of a link",
          source:
            "flowchart TD\n    A[Start] --> B{Is it?}\n    B -->|Yes| C[OK]\n    C --> D[Rethink]\n    D --> B\n    B ---->|No| E[End]\n",
          sha256: "49d93245842947c38b3169be332e9d9e4cf387b701c14d3f2f0dafc65103c206",
          cjk: false,
        },
        {
          id: "flowchart/094",
          title: "Minimum length of a link",
          source:
            "flowchart TD\n    A[Start] --> B{Is it?}\n    B -- Yes --> C[OK]\n    C --> D[Rethink]\n    D --> B\n    B -- No ----> E[End]\n",
          sha256: "96d66977bb2506fdd1d02f95a7308e33e18c41b9ce1a416fcaae0334e8de7000",
          cjk: false,
        },
        {
          id: "flowchart/095",
          title: "Special characters that break syntax",
          source: 'flowchart LR\n    id1["This is the (text) in the box"]\n',
          sha256: "0b5f81881322a47d2a59fe787b363a36e5e0b768f459dc9e564f2a6c0d02ff50",
          cjk: false,
        },
        {
          id: "flowchart/096",
          title: "Entity codes to escape characters",
          source:
            '    flowchart LR\n        A["A double quote:#quot;"] --> B["A dec char:#9829;"]\n',
          sha256: "1991365e32c80782ff060da5399b222d32034c0184a9b5b5f0d1302521c282b8",
          cjk: false,
        },
        {
          id: "flowchart/097",
          title: "Subgraphs",
          source:
            "flowchart TB\n    c1-->a2\n    subgraph one\n    a1-->a2\n    end\n    subgraph two\n    b1-->b2\n    end\n    subgraph three\n    c1-->c2\n    end\n",
          sha256: "b9675066f5fb1cb73c137c788366fc5bcd334cccfbbbee56b2fbb505ab782fd3",
          cjk: false,
        },
        {
          id: "flowchart/098",
          title: "Subgraphs",
          source: "flowchart TB\n    c1-->a2\n    subgraph ide1 [one]\n    a1-->a2\n    end\n",
          sha256: "8af2741f77e4425fb870f66ac183f18ad64f9fb89bb8d80f1b8a82d036e555eb",
          cjk: false,
        },
        {
          id: "flowchart/099",
          title: "flowcharts",
          source:
            "flowchart TB\n    c1-->a2\n    subgraph one\n    a1-->a2\n    end\n    subgraph two\n    b1-->b2\n    end\n    subgraph three\n    c1-->c2\n    end\n    one --> two\n    three --> two\n    two --> c2\n",
          sha256: "1c231ae5c6296a881b62b3c2e7f7b786fc66fbc449d2a134b7bc5d54a917dc18",
          cjk: false,
        },
        {
          id: "flowchart/100",
          title: "Direction in subgraphs",
          source:
            "flowchart LR\n  subgraph TOP\n    direction TB\n    subgraph B1\n        direction RL\n        i1 -->f1\n    end\n    subgraph B2\n        direction BT\n        i2 -->f2\n    end\n  end\n  A --> TOP --> B\n  B1 --> B2\n",
          sha256: "6897cf10b879aea931c767b87da1d418708bc32d666a506880bd282a738c4497",
          cjk: false,
        },
        {
          id: "flowchart/101",
          title: "Limitation",
          source:
            "flowchart LR\n    subgraph subgraph1\n        direction TB\n        top1[top] --> bottom1[bottom]\n    end\n    subgraph subgraph2\n        direction TB\n        top2[top] --> bottom2[bottom]\n    end\n    %% ^ These subgraphs are identical, except for the links to them:\n\n    %% Link *to* subgraph1: subgraph1 direction is maintained\n    outside --> subgraph1\n    %% Link *within* subgraph2:\n    %% subgraph2 inherits the direction of the top-level graph (LR)\n    outside ---> top2\n",
          sha256: "4b7f53d8caa034dd5818133bab4c99c38ed717201fc6ab1d30780faf50cd93ef",
          cjk: false,
        },
        {
          id: "flowchart/102",
          title: "Collapsible subgraphs (v11.17.0+)",
          source:
            "flowchart TD\n    Start --> one\n    subgraph one [My Group]\n        A --> B\n        B --> C\n    end\n    one --> End\n    one@{ view: collapsed }\n",
          sha256: "011362669b9324c87459896a762674a757b0cb37a73b509b16481fe7d62c90e0",
          cjk: false,
        },
        {
          id: "flowchart/103",
          title: "Markdown Strings",
          source:
            '---\nconfig:\n  htmlLabels: false\n---\nflowchart LR\nsubgraph "One"\n  a("`The **cat**\n  in the hat`") -- "edge label" --> b{{"`The **dog** in the hog`"}}\nend\nsubgraph "`**Two**`"\n  c("`The **cat**\n  in the hat`") -- "`Bold **edge label**`" --> d("The dog in the hog")\nend\n',
          sha256: "14571e1d97419b3c252dc53cc37be3fd2d3f5dfc74ef68f6269ea89a1692397a",
          cjk: false,
        },
        {
          id: "flowchart/104",
          title: "Interaction",
          source:
            'flowchart LR\n    A-->B\n    B-->C\n    C-->D\n    click A callback "Tooltip for a callback"\n    click B "https://www.github.com" "This is a tooltip for a link"\n    click C call callback() "Tooltip for a callback"\n    click D href "https://www.github.com" "This is a tooltip for a link"\n',
          sha256: "91b6b817ef7138b71a6081d1f570fb5874b993e7521bd3550cb305ad7499b23c",
          cjk: false,
        },
        {
          id: "flowchart/105",
          title: "Interaction",
          source:
            'flowchart LR\n    A-->B\n    B-->C\n    C-->D\n    D-->E\n    click A "https://www.github.com" _blank\n    click B "https://www.github.com" "Open this in a new tab" _blank\n    click C href "https://www.github.com" _blank\n    click D href "https://www.github.com" "Open this in a new tab" _blank\n',
          sha256: "708f9d59a147723beeb2cb528b4a77f9ce6f12595f60999ab68c2547eb6c4756",
          cjk: false,
        },
        {
          id: "flowchart/106",
          title: "Comments",
          source:
            "flowchart LR\n%% this is a comment A -- text --> B{node}\n   A -- text --> B -- text2 --> C\n",
          sha256: "d4a0fe2fb1e21a59dd6bd7b5c455eaf8847b58393d3efa1538c1e6d664db8457",
          cjk: false,
        },
        {
          id: "flowchart/107",
          title: "Edge level curve style using Edge IDs (v11.10.0+)",
          source:
            "flowchart LR\n    A e1@==> B\n    A e2@--> C\n    e1@{ curve: linear }\n    e2@{ curve: natural }\n",
          sha256: "9ed74c540b8e118950b32fb431a09def94458dd0d324d5f8ce0d86e16b75d6f1",
          cjk: false,
        },
        {
          id: "flowchart/108",
          title: "Styling a node",
          source:
            "flowchart LR\n    id1(Start)-->id2(Stop)\n    style id1 fill:#f9f,stroke:#333,stroke-width:4px\n    style id2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5\n",
          sha256: "f4ddc73bd88be46e5f91b2386188d0ffbf9ee0e628168227fcd2e4cbba1da61d",
          cjk: false,
        },
        {
          id: "flowchart/109",
          title: "Classes",
          source: "flowchart LR\n    A:::someclass --> B\n    classDef someclass fill:#f96\n",
          sha256: "f76e6573d220a56a3c93de9bf26859ece01fd527d40a305f620fe0a59633759f",
          cjk: false,
        },
        {
          id: "flowchart/110",
          title: "Classes",
          source:
            "flowchart LR\n    A:::foo & B:::bar --> C:::foobar\n    classDef foo stroke:#f00\n    classDef bar stroke:#0f0\n    classDef foobar stroke:#00f\n",
          sha256: "2f558b7a3d584673d4632471882fa110529283acb818c5b971fb8abbcafa7a44",
          cjk: false,
        },
        {
          id: "flowchart/111",
          title: "CSS classes",
          source:
            "flowchart LR\n    A:::myStyle --> B\n    classDef myStyle fill:#ff0000,stroke:#ffff00,stroke-width:4px\n",
          sha256: "53bb4045f74d8c9d1bb46c378e63387284704ef39ed42ca9a6f7dbd7e91e51d0",
          cjk: false,
        },
        {
          id: "flowchart/112",
          title: "Basic support for fontawesome",
          source:
            'flowchart TD\n    B["fa:fa-twitter for peace"]\n    B-->C[fa:fa-ban forbidden]\n    B-->D(fa:fa-spinner)\n    B-->E(A fa:fa-camera-retro perhaps?)\n',
          sha256: "e5ab6951896e8d3c80ccc9b6a4cf54c83f32d43c23173a3c06072aa30a9857f8",
          cjk: false,
        },
        {
          id: "flowchart/113",
          title: "Custom icons",
          source:
            'flowchart TD\n    B["fa:fa-twitter for peace"]\n    B-->C["fab:fa-truck-bold a custom icon"]\n',
          sha256: "a18dbc06d2617b03ecaeb541d791abcfaf57141bc3a0b6d4b456154973271351",
          cjk: false,
        },
        {
          id: "flowchart/114",
          title: "Graph declarations with spaces between vertices and link and without semicolon",
          source:
            "flowchart LR\n    A[Hard edge] -->|Link text| B(Round edge)\n    B --> C{Decision}\n    C -->|One| D[Result one]\n    C -->|Two| E[Result two]\n",
          sha256: "46c4d04542ff7c8e262334d4a5f5024c3aa8fc4fbe6bcfb36293ef2679402386",
          cjk: false,
        },
      ],
    },
    {
      type: "swimlanes",
      name: "Swimlanes Diagram",
      documentation: "https://mermaid.js.org/syntax/swimlanes.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/swimlanes.md",
      cases: [
        {
          id: "swimlanes/001",
          title: "With the defaults",
          source:
            "swimlane-beta LR\n  subgraph Customer\n    Browse[Browse catalogue]\n    Pay[Pay]\n  end\n  subgraph Warehouse\n    Pick[Pick items]\n    Ship[Ship order]\n  end\n  subgraph Finance\n    Invoice[Raise invoice]\n  end\n  Browse --> Pay\n  Pay --> Pick\n  Pick --> Ship\n  Pay --> Invoice\n",
          sha256: "7677982d4cd415d8df8d49845f61e162f3f2d81532c4c566556396e69300b330",
          cjk: false,
        },
        {
          id: "swimlanes/002",
          title: "The previous appearance",
          source:
            "---\nconfig:\n  theme: default\n  look: classic\n---\nswimlane-beta LR\n  subgraph Customer\n    Browse[Browse catalogue]\n    Pay[Pay]\n  end\n  subgraph Warehouse\n    Pick[Pick items]\n    Ship[Ship order]\n  end\n  subgraph Finance\n    Invoice[Raise invoice]\n  end\n  Browse --> Pay\n  Pay --> Pick\n  Pick --> Ship\n  Pay --> Invoice\n",
          sha256: "168c3ccf3a723485eac81692d140ac0d9fd6656f0116333bb801aba31b936c14",
          cjk: false,
        },
        {
          id: "swimlanes/003",
          title: "Basic Example",
          source:
            "swimlane-beta LR\n  subgraph Customer\n    request[Request service]\n    receive[Receive update]\n  end\n\n  subgraph Support\n    triage[Triage request]\n    answer[Send answer]\n  end\n\n  subgraph Engineering\n    investigate[Investigate issue]\n    fix[Prepare fix]\n  end\n\n  request --> triage\n  triage -->|Known issue| answer\n  triage -->|Needs code change| investigate\n  investigate --> fix --> answer\n  answer --> receive\n",
          sha256: "867cca281590bce55e2203afaa79899f556b2af97075e5b4da927b463ceaa584",
          cjk: false,
        },
        {
          id: "swimlanes/004",
          title: "Lanes",
          source:
            "swimlane-beta\n  subgraph Sales\n    lead[Qualify lead]\n    quote[Prepare quote]\n  end\n",
          sha256: "8dfe9a424d0b625f1340496a8d8f9c28368a304c0b5298c840ef3fdd5f1e294e",
          cjk: false,
        },
        {
          id: "swimlanes/005",
          title: "Lanes",
          source:
            "swimlane-beta LR\n  subgraph sales [Sales team]\n    lead[Qualify lead]\n    quote[Prepare quote]\n  end\n\n  subgraph finance [Finance team]\n    review[Review terms]\n    approve[Approve quote]\n  end\n\n  lead --> quote --> review --> approve\n",
          sha256: "60c192d9e1edf6ad5e7028ac4876cf104f64ecd4f3eeb2c2ced45b5b36ad8c99",
          cjk: false,
        },
        {
          id: "swimlanes/006",
          title: "Nodes",
          source:
            "swimlane-beta LR\n  subgraph Intake\n    start([Start])\n    task[Do work]\n    fix[Fix issues]\n  end\n\n  subgraph Review\n    decision{Ready?}\n  end\n\n  subgraph Complete\n    done((Done))\n  end\n\n  start --> task --> decision\n  decision -->|Yes| done\n  decision -->|No| fix\n  fix --> task\n",
          sha256: "aa3016964e4787fc4f09e0f38d9255cc0906cdd7c32aded850d5bab023f22491",
          cjk: false,
        },
        {
          id: "swimlanes/007",
          title: "Edges",
          source:
            "swimlane-beta LR\n  subgraph Buyer\n    choose[Choose product]\n    pay[Pay invoice]\n  end\n\n  subgraph Store\n    reserve[Reserve stock]\n    ship[Ship product]\n  end\n\n  choose --> reserve\n  reserve -->|Invoice ready| pay\n  pay --> ship\n",
          sha256: "c97fe4d378535c6bfa50cb0c5de07708acf8bbd06599522821741f0ca55e8c32",
          cjk: false,
        },
        {
          id: "swimlanes/008",
          title: "Accessibility",
          source:
            "swimlane-beta LR\n  accTitle: Support escalation\n  accDescr: A request starts with the customer, is triaged by support, and may be escalated to engineering.\n\n  subgraph Customer\n    request[Open request]\n  end\n\n  subgraph Support\n    triage[Triage]\n  end\n\n  subgraph Engineering\n    resolve[Resolve]\n  end\n\n  request --> triage --> resolve\n",
          sha256: "4eca0116897bbb8d96b5c102c167221adeb219c2aaba771dce943425f247c463",
          cjk: false,
        },
        {
          id: "swimlanes/009",
          title: "Make Each Lane Mean One Kind of Ownership",
          source:
            "swimlane-beta LR\n  subgraph Customer\n    submit[Submit order]\n    confirm[Confirm delivery]\n  end\n\n  subgraph Store\n    check[Check order]\n    pack[Pack items]\n  end\n\n  subgraph Carrier\n    collect[Collect package]\n    deliver[Deliver package]\n  end\n\n  submit --> check --> pack --> collect --> deliver --> confirm\n",
          sha256: "d35379f671d80f98c430091e13cecce24d657bb3ac106933b573cff7eef5bf0c",
          cjk: false,
        },
        {
          id: "swimlanes/010",
          title: "Label Cross-Lane Handoffs",
          source:
            "swimlane-beta LR\n  subgraph Applicant\n    apply[Submit application]\n    sign[Sign agreement]\n  end\n\n  subgraph Reviewer\n    screen[Screen application]\n    decide{Approved?}\n  end\n\n  subgraph System\n    create[Create account]\n    notify[Send welcome email]\n  end\n\n  apply -->|Application received| screen\n  screen --> decide\n  decide -->|Approved| create --> notify --> sign\n  decide -->|Needs changes| apply\n",
          sha256: "eaf819cfb8594d42a67a17ec34ad73bb0699dac6c71e610208c8d353940ecbd6",
          cjk: false,
        },
        {
          id: "swimlanes/011",
          title: "Keep Long Processes Readable",
          source:
            "swimlane-beta TB\n  subgraph Intake\n    collect[Collect request]\n    validate[Validate details]\n  end\n\n  subgraph Review\n    review[Review request]\n    decide{Ready?}\n  end\n\n  subgraph Delivery\n    schedule[Schedule work]\n    complete[Complete work]\n  end\n\n  collect --> validate --> review --> decide\n  decide -->|Yes| schedule --> complete\n  decide -->|No| collect\n",
          sha256: "27ad3133a24aae1a3133c343fc71299eaa4021a3ba9524742ae87c917db633be",
          cjk: false,
        },
        {
          id: "swimlanes/012",
          title: "Use Stable Ids",
          source:
            "swimlane-beta LR\n  subgraph ops [Operations]\n    intake[Receive request]\n    plan[Plan work]\n  end\n\n  subgraph legal [Legal]\n    review[Review contract]\n  end\n\n  intake --> plan --> review\n\n  classDef attention fill:#fff2cc,stroke:#d6a500,color:#111;\n  class review attention;\n",
          sha256: "3328f094a66a6a947e4e2ba71c58ce478cff19d361d32345c9aea33bf780245b",
          cjk: false,
        },
        {
          id: "swimlanes/013",
          title: "Put Decisions Where They Are Made",
          source:
            "swimlane-beta LR\n  subgraph Support\n    classify{Can support solve it?}\n    respond[Respond to customer]\n  end\n\n  subgraph Product\n    prioritize[Prioritize fix]\n  end\n\n  subgraph Engineering\n    implement[Implement fix]\n  end\n\n  classify -->|Yes| respond\n  classify -->|No| prioritize --> implement --> respond\n",
          sha256: "74df22ac9f981a34ffc429d0ac9b77ffbe0bb953a902187d0e1aeaf913d91e9c",
          cjk: false,
        },
      ],
    },
    {
      type: "sequenceDiagram",
      name: "Sequence Diagram",
      documentation: "https://mermaid.js.org/syntax/sequenceDiagram.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/sequenceDiagram.md",
      cases: [
        {
          id: "sequenceDiagram/001",
          title: "Sequence diagrams",
          source:
            "sequenceDiagram\n    Alice->>John: Hello John, how are you?\n    John-->>Alice: Great!\n    Alice-)John: See you later!\n",
          sha256: "b2066a62d878a2b2b1ad49be0674b68d0fb78deed9c5def176cfcb2340403d25",
          cjk: false,
        },
        {
          id: "sequenceDiagram/002",
          title: "With the defaults",
          source:
            "sequenceDiagram\n  autonumber\n  actor Customer\n  participant Web as Web app\n  participant API as API gateway\n  participant Bank\n  Customer->>Web: Place order\n  Web->>API: POST /orders\n  activate API\n  API->>Bank: Authorise payment\n  Bank-->>API: Approved\n  API-->>Web: 201 Created\n  deactivate API\n  Web-->>Customer: Order confirmed\n  Note over Customer,Bank: One order, one transaction\n",
          sha256: "b46ca8f030ae22c724720f00d238e528d416593c51d52a6e4f22d99b99f93b2d",
          cjk: false,
        },
        {
          id: "sequenceDiagram/003",
          title: "The previous appearance",
          source:
            "---\nconfig:\n  theme: default\n  look: classic\n---\nsequenceDiagram\n  autonumber\n  actor Customer\n  participant Web as Web app\n  participant API as API gateway\n  participant Bank\n  Customer->>Web: Place order\n  Web->>API: POST /orders\n  activate API\n  API->>Bank: Authorise payment\n  Bank-->>API: Approved\n  API-->>Web: 201 Created\n  deactivate API\n  Web-->>Customer: Order confirmed\n  Note over Customer,Bank: One order, one transaction\n",
          sha256: "ab0098ce21b8fb1ae07229e642d40a225ed767cb4158ebd00657a54bda716531",
          cjk: false,
        },
        {
          id: "sequenceDiagram/004",
          title: "Participants",
          source:
            "sequenceDiagram\n    participant Alice\n    participant Bob\n    Bob->>Alice: Hi Alice\n    Alice->>Bob: Hi Bob\n",
          sha256: "469a26df510d0cc0bf5a2160f1b03054162ea125f3c5e7f84573f4f73f4c17f2",
          cjk: false,
        },
        {
          id: "sequenceDiagram/005",
          title: "Actors",
          source:
            "sequenceDiagram\n    actor Alice\n    actor Bob\n    Alice->>Bob: Hi Bob\n    Bob->>Alice: Hi Alice\n",
          sha256: "2ae466706c787aa96a3f5e09de4710ce4ab41da116a15bf3733cae7b6d641f12",
          cjk: false,
        },
        {
          id: "sequenceDiagram/006",
          title: "Boundary",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "boundary" }\n    participant Bob\n    Alice->>Bob: Request from boundary\n    Bob->>Alice: Response to boundary\n',
          sha256: "09a6b5bea4819db49acb43677db21085fda3a95b65528d60efb0b9f9b0919e6c",
          cjk: false,
        },
        {
          id: "sequenceDiagram/007",
          title: "Control",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "control" }\n    participant Bob\n    Alice->>Bob: Control request\n    Bob->>Alice: Control response\n',
          sha256: "969bb3ce641248b40d28f7e4dadd86818f031c45193930dfb96c555eacc1da74",
          cjk: false,
        },
        {
          id: "sequenceDiagram/008",
          title: "Entity",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "entity" }\n    participant Bob\n    Alice->>Bob: Entity request\n    Bob->>Alice: Entity response\n',
          sha256: "c1a1ef0597c2a31357aef97c36cdf253592cb06f5af93a999c6490da0bb5c249",
          cjk: false,
        },
        {
          id: "sequenceDiagram/009",
          title: "Database",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "database" }\n    participant Bob\n    Alice->>Bob: DB query\n    Bob->>Alice: DB result\n',
          sha256: "f158c3d82a5bf4f7e1e05960ab5eb85e910c71ffd2feb37dcd76661a4795c102",
          cjk: false,
        },
        {
          id: "sequenceDiagram/010",
          title: "Collections",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "collections" }\n    participant Bob\n    Alice->>Bob: Collections request\n    Bob->>Alice: Collections response\n',
          sha256: "bbb78a10baa2dc83bf66bea92a171455665a363e44d38c02951af0083296ba0c",
          cjk: false,
        },
        {
          id: "sequenceDiagram/011",
          title: "Queue",
          source:
            'sequenceDiagram\n    participant Alice@{ "type" : "queue" }\n    participant Bob\n    Alice->>Bob: Queue message\n    Bob->>Alice: Queue response\n',
          sha256: "c7329c9b4aba72a7a47adf93c67e032d78c927945b22a4cfb8b6c995af148efb",
          cjk: false,
        },
        {
          id: "sequenceDiagram/012",
          title: "External Alias Syntax",
          source:
            "sequenceDiagram\n    participant A as Alice\n    participant J as John\n    A->>J: Hello John, how are you?\n    J->>A: Great!\n",
          sha256: "b833048175d5418f3346650eac414112d00518cbef48e0aaa9ebfd0c874fa89d",
          cjk: false,
        },
        {
          id: "sequenceDiagram/013",
          title: "External Alias Syntax",
          source:
            'sequenceDiagram\n    participant API@{ "type": "boundary" } as Public API\n    actor DB@{ "type": "database" } as User Database\n    participant Svc@{ "type": "control" } as Auth Service\n    API->>Svc: Authenticate\n    Svc->>DB: Query user\n    DB-->>Svc: User data\n    Svc-->>API: Token\n',
          sha256: "be26e07607d48aa8e0514a845d98446f206f3728cdd4b6b42e9add3cced0bb13",
          cjk: false,
        },
        {
          id: "sequenceDiagram/014",
          title: "Inline Alias Syntax",
          source:
            'sequenceDiagram\n    participant API@{ "type": "boundary", "alias": "Public API" }\n    participant Auth@{ "type": "control", "alias": "Auth Service" }\n    participant DB@{ "type": "database", "alias": "User Database" }\n    API->>Auth: Login request\n    Auth->>DB: Query user\n    DB-->>Auth: User data\n    Auth-->>API: Access token\n',
          sha256: "ed25c7aa66b7d0181e20fb015fd49edbf10d89db03bda3ec62031b9e7fdb1eb3",
          cjk: false,
        },
        {
          id: "sequenceDiagram/015",
          title: "Alias Precedence",
          source:
            'sequenceDiagram\n    participant API@{ "type": "boundary", "alias": "Internal Name" } as External Name\n    participant DB@{ "type": "database", "alias": "Internal DB" } as External DB\n    API->>DB: Query\n    DB-->>API: Result\n',
          sha256: "1371ae9ae607217a0c399c5f33fabdef706e03d30e317c252f34cd2c45467ae1",
          cjk: false,
        },
        {
          id: "sequenceDiagram/016",
          title: "Actor Creation and Destruction (v10.3.0+)",
          source:
            "sequenceDiagram\n    Alice->>Bob: Hello Bob, how are you ?\n    Bob->>Alice: Fine, thank you. And you?\n    create participant Carl\n    Alice->>Carl: Hi Carl!\n    create actor D as Donald\n    Carl->>D: Hi!\n    destroy Carl\n    Alice-xCarl: We are too many\n    destroy Bob\n    Bob->>Alice: I agree\n",
          sha256: "5fa9f1e6f236b76b71424993a30eac3e12fa3c6b6f336ee7bc9d028c44914ccb",
          cjk: false,
        },
        {
          id: "sequenceDiagram/017",
          title: "Grouping / Box",
          source:
            "    sequenceDiagram\n    box Purple Alice & John\n    participant A\n    participant J\n    end\n    box Another Group\n    participant B\n    participant C\n    end\n    A->>J: Hello John, how are you?\n    J->>A: Great!\n    A->>B: Hello Bob, how is Charley?\n    B->>C: Hello Charley, how are you?\n",
          sha256: "93d3c0ff3d5d384a0044c0882501febf51d0ba59c26ca2c237eae58d27ad53aa",
          cjk: false,
        },
        {
          id: "sequenceDiagram/018",
          title: "Basic Syntax",
          source:
            "sequenceDiagram\n    participant Alice\n    participant John\n    Alice->>()John: Hello John\n    Alice()->>John: How are you?\n    John()->>()Alice: Great!\n",
          sha256: "a013ca4947e10afb33ed61e770258c8327297c14884d11e77fdd135b8a789411",
          cjk: false,
        },
        {
          id: "sequenceDiagram/019",
          title: "Activations",
          source:
            "sequenceDiagram\n    Alice->>John: Hello John, how are you?\n    activate John\n    John-->>Alice: Great!\n    deactivate John\n",
          sha256: "4a26f3e25a18453906201f05c271691d7c53a3fcb2d1b81bd47077b3f9e131c0",
          cjk: false,
        },
        {
          id: "sequenceDiagram/020",
          title: "Activations",
          source:
            "sequenceDiagram\n    Alice->>+John: Hello John, how are you?\n    John-->>-Alice: Great!\n",
          sha256: "028189a67587cce218844ff2f7e9ef4b97b49fb756b844a090ec5de9440469be",
          cjk: false,
        },
        {
          id: "sequenceDiagram/021",
          title: "Activations",
          source:
            "sequenceDiagram\n    Alice->>+John: Hello John, how are you?\n    Alice->>+John: John, can you hear me?\n    John-->>-Alice: Hi Alice, I can hear you!\n    John-->>-Alice: I feel great!\n",
          sha256: "8a0283b4e38a5069c52d99c3d48bd613e409c3817082ee2687720d22fc765660",
          cjk: false,
        },
        {
          id: "sequenceDiagram/022",
          title: "Notes",
          source: "sequenceDiagram\n    participant John\n    Note right of John: Text in note\n",
          sha256: "592325d67537970355724d77fa9fdd310904e33537cd0ec6c8fe02fd8885c7df",
          cjk: false,
        },
        {
          id: "sequenceDiagram/023",
          title: "Notes",
          source:
            "sequenceDiagram\n    Alice->John: Hello John, how are you?\n    Note over Alice,John: A typical interaction\n",
          sha256: "a9915542fa20e2bf5e76e2b294d59ad13565386a70e63d5faf10c7f033a81874",
          cjk: false,
        },
        {
          id: "sequenceDiagram/024",
          title: "Line breaks",
          source:
            "sequenceDiagram\n    Alice->John: Hello John,<br/>how are you?\n    Note over Alice,John: A typical interaction<br/>But now in two lines\n",
          sha256: "c68e948fd0030ddd4f49b540a1b72fec5c4e88f5286c612a9f25ab77844d54c0",
          cjk: false,
        },
        {
          id: "sequenceDiagram/025",
          title: "Line breaks",
          source:
            "sequenceDiagram\n    participant Alice as Alice<br/>Johnson\n    Alice->John: Hello John,<br/>how are you?\n    Note over Alice,John: A typical interaction<br/>But now in two lines\n",
          sha256: "40a5ae34a089954547d166bbe9b974aeb266cfcf0d724b1e32346261140e3984",
          cjk: false,
        },
        {
          id: "sequenceDiagram/026",
          title: "Loops",
          source:
            "sequenceDiagram\n    Alice->John: Hello John, how are you?\n    loop Every minute\n        John-->Alice: Great!\n    end\n",
          sha256: "d042768225fc2a2c6aed87e913d293db64cb8da27b430259f3161a3f684888b3",
          cjk: false,
        },
        {
          id: "sequenceDiagram/027",
          title: "Alt",
          source:
            "sequenceDiagram\n    Alice->>Bob: Hello Bob, how are you?\n    alt is sick\n        Bob->>Alice: Not so good :(\n    else is well\n        Bob->>Alice: Feeling fresh like a daisy\n    end\n    opt Extra response\n        Bob->>Alice: Thanks for asking\n    end\n",
          sha256: "5ba07f36cdf08b28445a16fd8f24d05afbf5cd349679847aab70f7fddf476084",
          cjk: false,
        },
        {
          id: "sequenceDiagram/028",
          title: "Parallel",
          source:
            "sequenceDiagram\n    par Alice to Bob\n        Alice->>Bob: Hello guys!\n    and Alice to John\n        Alice->>John: Hello guys!\n    end\n    Bob-->>Alice: Hi Alice!\n    John-->>Alice: Hi Alice!\n",
          sha256: "6c0cb8e242cbf8bdadf2c2cccad5c0b5b6938127e0c76574c3fcadf342055b84",
          cjk: false,
        },
        {
          id: "sequenceDiagram/029",
          title: "Parallel",
          source:
            "sequenceDiagram\n    par Alice to Bob\n        Alice->>Bob: Go help John\n    and Alice to John\n        Alice->>John: I want this done today\n        par John to Charlie\n            John->>Charlie: Can we do this today?\n        and John to Diana\n            John->>Diana: Can you help us today?\n        end\n    end\n",
          sha256: "af802c7e61fb411636f36a09caed92ea597c51fcae3f79976682ca3391962f3c",
          cjk: false,
        },
        {
          id: "sequenceDiagram/030",
          title: "Critical Region",
          source:
            "sequenceDiagram\n    critical Establish a connection to the DB\n        Service-->DB: connect\n    option Network timeout\n        Service-->Service: Log error\n    option Credentials rejected\n        Service-->Service: Log different error\n    end\n",
          sha256: "201a0912328e98f240b39c1412adc00d0bf51c483304d8078d4d8552dac24083",
          cjk: false,
        },
        {
          id: "sequenceDiagram/031",
          title: "Critical Region",
          source:
            "sequenceDiagram\n    critical Establish a connection to the DB\n        Service-->DB: connect\n    end\n",
          sha256: "a74c5de6ef55136d555087cde5874e57a2742175012a00e31ff405b59157f9fe",
          cjk: false,
        },
        {
          id: "sequenceDiagram/032",
          title: "Break",
          source:
            "sequenceDiagram\n    Consumer-->API: Book something\n    API-->BookingService: Start booking process\n    break when the booking process fails\n        API-->Consumer: show failure\n    end\n    API-->BillingService: Start billing process\n",
          sha256: "07788f7e3ced9064c9d896e61f0fecbab9124f37b6e4eaed7d06dfb18044c9ca",
          cjk: false,
        },
        {
          id: "sequenceDiagram/033",
          title: "Background Highlighting",
          source:
            "sequenceDiagram\n    participant Alice\n    participant John\n\n    rect rgb(191, 223, 255)\n    note right of Alice: Alice calls John.\n    Alice->>+John: Hello John, how are you?\n    rect rgb(200, 150, 255)\n    Alice->>+John: John, can you hear me?\n    John-->>-Alice: Hi Alice, I can hear you!\n    end\n    John-->>-Alice: I feel great!\n    end\n    Alice ->>+ John: Did you want to go to the game tonight?\n    John -->>- Alice: Yeah! See you there.\n",
          sha256: "14a8499e6a6067332344a42b252e162c5bee97971999dbd1e58239c3f8f39732",
          cjk: false,
        },
        {
          id: "sequenceDiagram/034",
          title: "Comments",
          source:
            "sequenceDiagram\n    Alice->>John: Hello John, how are you?\n    %% this is a comment\n    John-->>Alice: Great!\n",
          sha256: "c404e4ed538f9b3bae43c673dd0b698b15eace1eeaed6b1fb60622f621514e5a",
          cjk: false,
        },
        {
          id: "sequenceDiagram/035",
          title: "Entity codes to escape characters",
          source:
            "sequenceDiagram\n    A->>B: I #9829; you!\n    B->>A: I #9829; you #infin; times more!\n",
          sha256: "942c34f9cb6c3d14f51620085702449a986e34569759d1723ff02b6daec278c3",
          cjk: false,
        },
        {
          id: "sequenceDiagram/036",
          title: "sequenceNumbers",
          source:
            "sequenceDiagram\n    autonumber\n    Alice->>John: Hello John, how are you?\n    loop HealthCheck\n        John->>John: Fight against hypochondria\n    end\n    Note right of John: Rational thoughts!\n    John-->>Alice: Great!\n    John->>Bob: How about you?\n    Bob-->>John: Jolly good!\n",
          sha256: "df13c1b9dfa701372a204f3e95e6e5a009848159943bfe7f348bea98d25ecf3e",
          cjk: false,
        },
        {
          id: "sequenceDiagram/037",
          title: "Actor Menus",
          source:
            "sequenceDiagram\n    participant Alice\n    participant John\n    link Alice: Dashboard @ https://dashboard.contoso.com/alice\n    link Alice: Wiki @ https://wiki.contoso.com/alice\n    link John: Dashboard @ https://dashboard.contoso.com/john\n    link John: Wiki @ https://wiki.contoso.com/john\n    Alice->>John: Hello John, how are you?\n    John-->>Alice: Great!\n    Alice-)John: See you later!\n",
          sha256: "a6b0082ad10a3227348a86637c56ff2f6ef95659a1321854edcade6a11affad9",
          cjk: false,
        },
        {
          id: "sequenceDiagram/038",
          title: "Advanced Menu Syntax",
          source:
            'sequenceDiagram\n    participant Alice\n    participant John\n    links Alice: {"Dashboard": "https://dashboard.contoso.com/alice", "Wiki": "https://wiki.contoso.com/alice"}\n    links John: {"Dashboard": "https://dashboard.contoso.com/john", "Wiki": "https://wiki.contoso.com/john"}\n    Alice->>John: Hello John, how are you?\n    John-->>Alice: Great!\n    Alice-)John: See you later!\n',
          sha256: "0f2f5747cfd486445e228641ccb9f7dbcb26dbfd5f5ef0ef4379c9d8a80a7e3d",
          cjk: false,
        },
      ],
    },
    {
      type: "classDiagram",
      name: "Class Diagram",
      documentation: "https://mermaid.js.org/syntax/classDiagram.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/classDiagram.md",
      cases: [
        {
          id: "classDiagram/001",
          title: "Class diagrams",
          source:
            '---\ntitle: Animal example\n---\nclassDiagram\n    note "From Duck till Zebra"\n    Animal <|-- Duck\n    note for Duck "can fly<br>can swim<br>can dive<br>can help in debugging"\n    Animal <|-- Fish\n    Animal <|-- Zebra\n    Animal : +int age\n    Animal : +String gender\n    Animal: +isMammal()\n    Animal: +mate()\n    class Duck{\n        +String beakColor\n        +swim()\n        +quack()\n    }\n    class Fish{\n        -int sizeInFeet\n        -canEat()\n    }\n    class Zebra{\n        +bool is_wild\n        +run()\n    }\n',
          sha256: "01f53b9e79db0fe31e23e5b0bd74fde68bf38de3255c838d9effb67403ffb77b",
          cjk: false,
        },
        {
          id: "classDiagram/002",
          title: "With the defaults",
          source:
            'classDiagram\n  class Customer {\n    +String name\n    +String email\n  }\n  class Order {\n    +String id\n    +Date placedAt\n    +total() Money\n  }\n  class LineItem {\n    +int quantity\n  }\n  class Payment {\n    <<interface>>\n    +authorise() bool\n  }\n  Customer "1" --> "*" Order : places\n  Order "1" *-- "*" LineItem : contains\n  Order --> Payment : settled by\n',
          sha256: "6fc2474e125b7cb551615e66013a65b77baf53183f680d4ca015cfc01e7487d6",
          cjk: false,
        },
        {
          id: "classDiagram/003",
          title: "The previous appearance",
          source:
            '---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nclassDiagram\n  class Customer {\n    +String name\n    +String email\n  }\n  class Order {\n    +String id\n    +Date placedAt\n    +total() Money\n  }\n  class LineItem {\n    +int quantity\n  }\n  class Payment {\n    <<interface>>\n    +authorise() bool\n  }\n  Customer "1" --> "*" Order : places\n  Order "1" *-- "*" LineItem : contains\n  Order --> Payment : settled by\n',
          sha256: "686bace011d6cb0762106e3cc28f63ad87c9664a3df59448336815a918215527",
          cjk: false,
        },
        {
          id: "classDiagram/004",
          title: "Class",
          source:
            "---\ntitle: Bank example\n---\nclassDiagram\n    class BankAccount\n    BankAccount : +String owner\n    BankAccount : +Bigdecimal balance\n    BankAccount : +deposit(amount)\n    BankAccount : +withdrawal(amount)\n",
          sha256: "618353c4e48dac71d499107efab6e01f57d9d2843762d32725f03e68cdbb4e00",
          cjk: false,
        },
        {
          id: "classDiagram/005",
          title: "Define a class",
          source: "classDiagram\n    class Animal\n    Vehicle <|-- Car\n",
          sha256: "498d9363ba8ed96f76ca34393fae13c085316490eb4dcb3b8207150641c90efd",
          cjk: false,
        },
        {
          id: "classDiagram/006",
          title: "Class labels",
          source:
            'classDiagram\n    class Animal["Animal with a label"]\n    class Car["Car with *! symbols"]\n    Animal --> Car\n',
          sha256: "cb3671b844c322481046811c745c5c7f838134e6e825031936164ed3448a753f",
          cjk: false,
        },
        {
          id: "classDiagram/007",
          title: "Class labels",
          source:
            "classDiagram\n    class `Animal Class!`\n    class `Car Class`\n    `Animal Class!` --> `Car Class`\n",
          sha256: "01f18827962a86cd547fe102cb53a52876ab44202f72214d96a8ba64bcb96cb9",
          cjk: false,
        },
        {
          id: "classDiagram/008",
          title: "Defining Members of a class",
          source:
            "classDiagram\nclass BankAccount\nBankAccount : +String owner\nBankAccount : +BigDecimal balance\nBankAccount : +deposit(amount)\nBankAccount : +withdrawal(amount)\n",
          sha256: "53b5bb9ec41a4729e9a47573fc8660bf806877eca73b121b40c01680b0710f59",
          cjk: false,
        },
        {
          id: "classDiagram/009",
          title: "Defining Members of a class",
          source:
            "classDiagram\nclass BankAccount{\n    +String owner\n    +BigDecimal balance\n    +deposit(amount)\n    +withdrawal(amount)\n}\n",
          sha256: "e8b9c18297d18e584124979e6bec048244b1d2e8529680dfe6cfa8f0154658ca",
          cjk: false,
        },
        {
          id: "classDiagram/010",
          title: "Return Type",
          source:
            "classDiagram\nclass BankAccount{\n    +String owner\n    +BigDecimal balance\n    +deposit(amount) bool\n    +withdrawal(amount) int\n}\n",
          sha256: "f0aa236caedfd3b0386daf59d051a22ea560c265c972c76e6a96782242e98695",
          cjk: false,
        },
        {
          id: "classDiagram/011",
          title: "Generic Types",
          source:
            "classDiagram\nclass Square~Shape~{\n    int id\n    List~int~ position\n    setPoints(List~int~ points)\n    getPoints() List~int~\n}\n\nSquare : -List~string~ messages\nSquare : +setMessages(List~string~ messages)\nSquare : +getMessages() List~string~\nSquare : +getDistanceMatrix() List~List~int~~\n",
          sha256: "ae91d8c13908d53c28fba8da2bc5e26fd37e9acf0b2d2d23e66838d583490dfc",
          cjk: false,
        },
        {
          id: "classDiagram/012",
          title: "Defining Relationship",
          source:
            "classDiagram\nclassA <|-- classB\nclassC *-- classD\nclassE o-- classF\nclassG <-- classH\nclassI -- classJ\nclassK <.. classL\nclassM <|.. classN\nclassO .. classP\n",
          sha256: "be1089506d91fe796c5b0bae849f179094037e12571efe1a97e3c21e750f89c2",
          cjk: false,
        },
        {
          id: "classDiagram/013",
          title: "Defining Relationship",
          source:
            "classDiagram\nclassA --|> classB : Inheritance\nclassC --* classD : Composition\nclassE --o classF : Aggregation\nclassG --> classH : Association\nclassI -- classJ : Link(Solid)\nclassK ..> classL : Dependency\nclassM ..|> classN : Realization\nclassO .. classP : Link(Dashed)\n",
          sha256: "5bf186aeaa81d334310d039037534e909f064fdc330d859b0a0f00464b3031c0",
          cjk: false,
        },
        {
          id: "classDiagram/014",
          title: "Labels on Relations",
          source:
            "classDiagram\nclassA <|-- classB : implements\nclassC *-- classD : composition\nclassE o-- classF : aggregation\n",
          sha256: "029e13c779ccef5ed4bbab74cf26205edc74cf4e34cd0881a24081e5e0dfe5b0",
          cjk: false,
        },
        {
          id: "classDiagram/015",
          title: "Two-way relations",
          source: "classDiagram\n    Animal <|--|> Zebra\n",
          sha256: "534a9ea547b5f63ee18a26222e3cfb69a72c9868e7572968d4018b17659ca11d",
          cjk: false,
        },
        {
          id: "classDiagram/016",
          title: "Lollipop Interfaces",
          source: "classDiagram\n  bar ()-- foo\n",
          sha256: "bc06236e060fb61456347036418cc597f4128e50a624a8e20969c204aa0e7b45",
          cjk: false,
        },
        {
          id: "classDiagram/017",
          title: "Lollipop Interfaces",
          source:
            "classDiagram\n  class Class01 {\n    int amount\n    draw()\n  }\n  Class01 --() bar\n  Class02 --() bar\n\n  foo ()-- Class01\n",
          sha256: "b06c5b3c315577675c074030e9148240d6aa071553fbbb27b6ea0ca47fffdcea",
          cjk: false,
        },
        {
          id: "classDiagram/018",
          title: "Define Namespace",
          source:
            "classDiagram\nnamespace BaseShapes {\n    class Triangle\n    class Rectangle {\n      double width\n      double height\n    }\n}\n",
          sha256: "570ea6adde22d184fa0f4cff73ecd7681bd942bb6124eddf874cbcd1d20ec3e2",
          cjk: false,
        },
        {
          id: "classDiagram/019",
          title: "Namespace Labels (v11.15.0+)",
          source:
            'classDiagram\n    namespace Auth["Authentication Service"] {\n        class UserService {\n            +login()\n            +logout()\n        }\n    }\n',
          sha256: "09461b572f3e64fdd7b6dfc3e1c2ff108e81c29f2b7a35c5f3b16df97044ae63",
          cjk: false,
        },
        {
          id: "classDiagram/020",
          title: "Nested Namespaces (v11.15.0+)",
          source:
            "classDiagram\n    namespace Company.Engineering.Backend {\n        class Developer {\n            +writeCode()\n        }\n    }\n    namespace Company.Engineering.Frontend {\n        class Designer {\n            +createMockup()\n        }\n    }\n    namespace Company.Engineering {\n        class TechLead {\n            +planSprint()\n        }\n    }\n    TechLead --> Developer : leads\n    TechLead --> Designer : leads\n",
          sha256: "0d65c6d0a5ad4ca15f66a44254deae81b8ace4dd7957db07b9e1ad365656b54b",
          cjk: false,
        },
        {
          id: "classDiagram/021",
          title: "Nested Namespaces (v11.15.0+)",
          source:
            "classDiagram\n    namespace Platform {\n        namespace Auth {\n            class UserService {\n                +login()\n                +logout()\n            }\n        }\n        namespace Data {\n            class Repository {\n                +find()\n                +save()\n            }\n        }\n        class Gateway {\n            +route()\n        }\n    }\n    Gateway --> UserService : delegates\n    Gateway --> Repository : delegates\n",
          sha256: "f609930d3f256adb0e383d5c08e56ec595fe79f710a64ba6ffb08a19095722a4",
          cjk: false,
        },
        {
          id: "classDiagram/022",
          title: "Compact rendering (`hierarchicalNamespaces: false`)",
          source:
            "---\nconfig:\n  class:\n    hierarchicalNamespaces: false\n---\nclassDiagram\n    namespace Company.Engineering.Backend {\n        class Developer {\n            +writeCode()\n        }\n    }\n    namespace Company.Engineering.Frontend {\n        class Designer {\n            +createMockup()\n        }\n    }\n    namespace Company {\n        class CEO {\n            +makeDecisions()\n        }\n    }\n    CEO --> Developer : oversees\n    CEO --> Designer : oversees\n",
          sha256: "6ae0bb98620e85b714fc1c5ebdb56038e67ef107d005054cca30f8c93cfe964e",
          cjk: false,
        },
        {
          id: "classDiagram/023",
          title: "Cardinality / Multiplicity on relations",
          source:
            'classDiagram\n    Customer "1" --> "*" Ticket\n    Student "1" --> "1..*" Course\n    Galaxy --> "many" Star : Contains\n',
          sha256: "389b20dbb0e53539993bc29642ac829249bb778ca4ee8cc3e30efb6c7d79f502",
          cjk: false,
        },
        {
          id: "classDiagram/024",
          title: "Annotations on classes",
          source: "classDiagram\n  class Shape <<interface>>\n",
          sha256: "ffa1285b52b93c7e831c3a043c1ee653d827831b1eddf03a01356009bf1cf674",
          cjk: false,
        },
        {
          id: "classDiagram/025",
          title: "Annotations on classes",
          source:
            "classDiagram\nclass Shape\n<<interface>> Shape\nShape : noOfVertices\nShape : draw()\n",
          sha256: "463be631e2f877265d282f097d1db0d440ac7c118e35443933148ea1aae2c880",
          cjk: false,
        },
        {
          id: "classDiagram/026",
          title: "Annotations on classes",
          source:
            "classDiagram\nclass Shape{\n    <<interface>>\n    noOfVertices\n    draw()\n}\nclass Color{\n    <<enumeration>>\n    RED\n    BLUE\n    GREEN\n    WHITE\n    BLACK\n}\n",
          sha256: "612be9621bc210232dbf5ea7f94298cd67ccdd41c20460def0f15a52741a9db4",
          cjk: false,
        },
        {
          id: "classDiagram/027",
          title: "Comments",
          source:
            "classDiagram\n%% This whole line is a comment classDiagram class Shape <<interface>>\nclass Shape{\n    <<interface>>\n    noOfVertices\n    draw()\n}\n",
          sha256: "3efc2c903a0e392e9563dbd26787d23c25ac57230f4f36f29c1f3691fc00749f",
          cjk: false,
        },
        {
          id: "classDiagram/028",
          title: "Setting the direction of the diagram",
          source:
            'classDiagram\n  direction RL\n  class Student {\n    -idCard : IdCard\n  }\n  class IdCard{\n    -id : int\n    -name : string\n  }\n  class Bike{\n    -id : int\n    -name : string\n  }\n  Student "1" --o "1" IdCard : carries\n  Student "1" --o "1" Bike : rides\n',
          sha256: "0a59646c6c1de9af70a81e8fdbfc1c81d8ace475377925a24c9f659d9ecf616c",
          cjk: false,
        },
        {
          id: "classDiagram/029",
          title: "Examples",
          source:
            'classDiagram\n    note "This is a general note"\n    note for MyClass "This is a note for a class"\n    class MyClass{\n    }\n',
          sha256: "594dbbe914ff48d5f383ec0a8f6a7353e481e8cc143fb4cd788f07d92926e9b9",
          cjk: false,
        },
        {
          id: "classDiagram/030",
          title: "Examples",
          source:
            'classDiagram\nclass Shape\nlink Shape "https://www.github.com" "This is a tooltip for a link"\nclass Shape2\nclick Shape2 href "https://www.github.com" "This is a tooltip for a link"\n',
          sha256: "2d2e70a6d4d7aef668d2a15425e20c911f8a087e117cb3a26f14b2def98cbd57",
          cjk: false,
        },
        {
          id: "classDiagram/031",
          title: "Examples",
          source:
            'classDiagram\nclass Shape\ncallback Shape "callbackFunction" "This is a tooltip for a callback"\nclass Shape2\nclick Shape2 call callbackFunction() "This is a tooltip for a callback"\n',
          sha256: "500154a2ebe2ea23e19e275844c46a502a97b3af5e4f56c372df6e25e54b27f5",
          cjk: false,
        },
        {
          id: "classDiagram/032",
          title: "Examples",
          source:
            'classDiagram\n    class Class01\n    class Class02\n    callback Class01 "callbackFunction" "Callback tooltip"\n    link Class02 "https://www.github.com" "This is a link"\n    class Class03\n    class Class04\n    click Class03 call callbackFunction() "Callback tooltip"\n    click Class04 href "https://www.github.com" "This is a link"\n',
          sha256: "73500fcfdc6ba76a69dd5cf59c5ccd462c0681ee34a53ae8179a793658dcc39b",
          cjk: false,
        },
        {
          id: "classDiagram/033",
          title: "Styling a node",
          source:
            "classDiagram\n  class Animal\n  class Mineral\n  style Animal fill:#f9f,stroke:#333,stroke-width:4px\n  style Mineral fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5\n",
          sha256: "35072ea890247cd8e628a488d9eab59d5fe3fc072a6e3d28814bdc70d15b288b",
          cjk: false,
        },
        {
          id: "classDiagram/034",
          title: "Classes",
          source: "classDiagram\n    class Animal:::someclass\n    classDef someclass fill:#f96\n",
          sha256: "f91449deb55589d824aa658f9b60948b0369f053cd64b00e09e5435abbb402c9",
          cjk: false,
        },
        {
          id: "classDiagram/035",
          title: "Classes",
          source:
            "classDiagram\n    class Animal:::someclass {\n        -int sizeInFeet\n        -canEat()\n    }\n    classDef someclass fill:#f96\n",
          sha256: "b748773195c45c55088bd8cbf2ac9cce106f520c2458bbd57c04934c00bc7ee1",
          cjk: false,
        },
        {
          id: "classDiagram/036",
          title: "Default class",
          source:
            "classDiagram\n  class Animal:::pink\n  class Mineral\n\n  classDef default fill:#f96,color:red\n  classDef pink color:#f9f\n",
          sha256: "4fa7040920669722d525029d24140d2d93bcbd1a64188910c1d3580c9269f9d8",
          cjk: false,
        },
        {
          id: "classDiagram/037",
          title: "CSS Classes",
          source: "classDiagram\n    class Animal:::styleClass\n",
          sha256: "8b617777a9ad567d7d6fa1598b5af75b14098770e5aa177bb1a1da122f8c67f8",
          cjk: false,
        },
        {
          id: "classDiagram/038",
          title: "Possible configuration parameters:",
          source:
            "---\n  config:\n    class:\n      hideEmptyMembersBox: true\n---\nclassDiagram\n  class Duck\n",
          sha256: "d8142d901771e84973367a07746a191732015786b7783a2b7406385314cbb3ac",
          cjk: false,
        },
      ],
    },
    {
      type: "stateDiagram",
      name: "State Diagram",
      documentation: "https://mermaid.js.org/syntax/stateDiagram.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/stateDiagram.md",
      cases: [
        {
          id: "stateDiagram/001",
          title: "State diagrams",
          source:
            "---\ntitle: Simple sample\n---\nstateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]\n",
          sha256: "fc35188de9f919aa10f7bb302574c3bcdc2fc74a54434a5bc4ee33c57cff8d64",
          cjk: false,
        },
        {
          id: "stateDiagram/002",
          title: "State diagrams",
          source:
            "stateDiagram\n    [*] --> Still\n    Still --> [*]\n\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]\n",
          sha256: "39acf723262aa56455c7d2cfebc2348353ba00810ea9d82ad399f815f5810048",
          cjk: false,
        },
        {
          id: "stateDiagram/003",
          title: "With the defaults",
          source:
            "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Submitted : submit\n  state Review {\n    [*] --> Screening\n    Screening --> Decision\n  }\n  Submitted --> Review\n  Review --> Published : approved\n  Review --> Draft : rejected\n  Published --> [*]\n",
          sha256: "1e1b107393bac8aced893b21b2192b6ac3e7f993a5cbed5afe3c4aef8e488b0c",
          cjk: false,
        },
        {
          id: "stateDiagram/004",
          title: "The previous appearance",
          source:
            "---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nstateDiagram-v2\n  [*] --> Draft\n  Draft --> Submitted : submit\n  state Review {\n    [*] --> Screening\n    Screening --> Decision\n  }\n  Submitted --> Review\n  Review --> Published : approved\n  Review --> Draft : rejected\n  Published --> [*]\n",
          sha256: "9921022022234a8bff70a7f75782e71c99b48760d5e8e50d13e97439eaadbbbd",
          cjk: false,
        },
        {
          id: "stateDiagram/005",
          title: "States",
          source: "stateDiagram-v2\n    stateId\n",
          sha256: "bd780a3a2d167f1014a4c6e654d333d227057ffd42946970e533d61ea0907b37",
          cjk: false,
        },
        {
          id: "stateDiagram/006",
          title: "States",
          source: 'stateDiagram-v2\n    state "This is a state description" as s2\n',
          sha256: "31acb54a992766eeebfe18e59ed37c104247699077d2c727a1d2c0e02b733015",
          cjk: false,
        },
        {
          id: "stateDiagram/007",
          title: "States",
          source: "stateDiagram-v2\n    s2 : This is a state description\n",
          sha256: "e7475df8ff02639af8891e24b199160a17991b45bede216b2ebac89a8ed5afbe",
          cjk: false,
        },
        {
          id: "stateDiagram/008",
          title: "Transitions",
          source: "stateDiagram-v2\n    s1 --> s2\n",
          sha256: "ad45017122efa3019d856e560e060bf751cae87fb54770889a6c63623ca4a674",
          cjk: false,
        },
        {
          id: "stateDiagram/009",
          title: "Transitions",
          source: "stateDiagram-v2\n    s1 --> s2: A transition\n",
          sha256: "ad6754c39467d7b5deb867e48c2902a3d538af529f3306c00ee46f962911ab02",
          cjk: false,
        },
        {
          id: "stateDiagram/010",
          title: "Start and End",
          source: "stateDiagram-v2\n    [*] --> s1\n    s1 --> [*]\n",
          sha256: "f6ff1530a8fe9c5758478684c2fea3a38a82573468dd10e15709a018127ad6b0",
          cjk: false,
        },
        {
          id: "stateDiagram/011",
          title: "Composite states",
          source:
            "stateDiagram-v2\n    [*] --> First\n    state First {\n        [*] --> second\n        second --> [*]\n    }\n\n    [*] --> NamedComposite\n    NamedComposite: Another Composite\n    state NamedComposite {\n        [*] --> namedSimple\n        namedSimple --> [*]\n        namedSimple: Another simple\n    }\n",
          sha256: "885c8b1b173cbaf7f8bc07d0ca01f5ab8e132e23da6339a0de2d78f390154622",
          cjk: false,
        },
        {
          id: "stateDiagram/012",
          title: "Composite states",
          source:
            "stateDiagram-v2\n    [*] --> First\n\n    state First {\n        [*] --> Second\n\n        state Second {\n            [*] --> second\n            second --> Third\n\n            state Third {\n                [*] --> third\n                third --> [*]\n            }\n        }\n    }\n",
          sha256: "8375051aace412a1397897e6a0125a0ac15118bc9bc1ac3c5a4a4049b809dc59",
          cjk: false,
        },
        {
          id: "stateDiagram/013",
          title: "Composite states",
          source:
            "stateDiagram-v2\n    [*] --> First\n    First --> Second\n    First --> Third\n\n    state First {\n        [*] --> fir\n        fir --> [*]\n    }\n    state Second {\n        [*] --> sec\n        sec --> [*]\n    }\n    state Third {\n        [*] --> thi\n        thi --> [*]\n    }\n",
          sha256: "d637094dd39ae4705e8f815631680e5bd3c359bf0492ce3b94ecfda33b085279",
          cjk: false,
        },
        {
          id: "stateDiagram/014",
          title: "Choice",
          source:
            "stateDiagram-v2\n    state if_state <<choice>>\n    [*] --> IsPositive\n    IsPositive --> if_state\n    if_state --> False: if n < 0\n    if_state --> True : if n >= 0\n",
          sha256: "8b4cf7c3adaa9c5f03a2cd872d4df54f7ae0f605807d79a020d5f3063153369d",
          cjk: false,
        },
        {
          id: "stateDiagram/015",
          title: "Forks",
          source:
            "   stateDiagram-v2\n    state fork_state <<fork>>\n      [*] --> fork_state\n      fork_state --> State2\n      fork_state --> State3\n\n      state join_state <<join>>\n      State2 --> join_state\n      State3 --> join_state\n      join_state --> State4\n      State4 --> [*]\n",
          sha256: "9e139d5ea8476442387183b8db8a38de9ba330f3193ae0a46e395cea968e26bf",
          cjk: false,
        },
        {
          id: "stateDiagram/016",
          title: "Notes",
          source:
            "    stateDiagram-v2\n        State1: The state with a note\n        note right of State1\n            Important information! You can write\n            notes.\n        end note\n        State1 --> State2\n        note left of State2 : This is the note to the left.\n",
          sha256: "14b527de19785b23b4064bcf9abefdd11908df18024585cf04153d5760b56e3b",
          cjk: false,
        },
        {
          id: "stateDiagram/017",
          title: "Concurrency",
          source:
            "stateDiagram-v2\n    [*] --> Active\n\n    state Active {\n        [*] --> NumLockOff\n        NumLockOff --> NumLockOn : EvNumLockPressed\n        NumLockOn --> NumLockOff : EvNumLockPressed\n        --\n        [*] --> CapsLockOff\n        CapsLockOff --> CapsLockOn : EvCapsLockPressed\n        CapsLockOn --> CapsLockOff : EvCapsLockPressed\n        --\n        [*] --> ScrollLockOff\n        ScrollLockOff --> ScrollLockOn : EvScrollLockPressed\n        ScrollLockOn --> ScrollLockOff : EvScrollLockPressed\n    }\n",
          sha256: "17d68bbfe39896a12f203e29a754680b1a71aab56d3644f705e46edffee2fdbb",
          cjk: false,
        },
        {
          id: "stateDiagram/018",
          title: "Setting the direction of the diagram",
          source:
            "stateDiagram\n    direction LR\n    [*] --> A\n    A --> B\n    B --> C\n    state B {\n      direction LR\n      a --> b\n    }\n    B --> D\n",
          sha256: "e98ccbbe271e462ab9a40bb4f072643c7b0bb72df772694c8cac3a2ce35fab69",
          cjk: false,
        },
        {
          id: "stateDiagram/019",
          title: "Comments",
          source:
            "stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n%% this is a comment\n    Still --> Moving\n    Moving --> Still %% another comment\n    Moving --> Crash\n    Crash --> [*]\n",
          sha256: "19213af7efbabc66571d1ba1dfd8606947353f8e1b1dd3402b73eadb57eb38fc",
          cjk: false,
        },
        {
          id: "stateDiagram/020",
          title: "1. `class` statement",
          source:
            "   stateDiagram\n   direction TB\n\n   accTitle: This is the accessible title\n   accDescr: This is an accessible description\n\n   classDef notMoving fill:white\n   classDef movement font-style:italic\n   classDef badBadEvent fill:#f00,color:white,font-weight:bold,stroke-width:2px,stroke:yellow\n\n   [*]--> Still\n   Still --> [*]\n   Still --> Moving\n   Moving --> Still\n   Moving --> Crash\n   Crash --> [*]\n\n   class Still notMoving\n   class Moving, Crash movement\n   class Crash badBadEvent\n   class end badBadEvent\n",
          sha256: "186122eccfe5e212287860dcc6d6f4269d354a727eb7fdc7b13aeb9564427049",
          cjk: false,
        },
        {
          id: "stateDiagram/021",
          title: "2. `:::` operator to apply a style to a state",
          source:
            "stateDiagram\n   direction TB\n\n   accTitle: This is the accessible title\n   accDescr: This is an accessible description\n\n   classDef notMoving fill:white\n   classDef movement font-style:italic;\n   classDef badBadEvent fill:#f00,color:white,font-weight:bold,stroke-width:2px,stroke:yellow\n\n   [*] --> Still:::notMoving\n   Still --> [*]\n   Still --> Moving:::movement\n   Moving --> Still\n   Moving --> Crash:::movement\n   Crash:::badBadEvent --> [*]\n",
          sha256: "592b1439148ea5a969a2ab0b0d705509e2ba88b19a607d2480e9dd032982535b",
          cjk: false,
        },
        {
          id: "stateDiagram/022",
          title: "Spaces in state names",
          source:
            "stateDiagram\n    classDef yourState font-style:italic,font-weight:bold,fill:white\n\n    yswsii: Your state with spaces in it\n    [*] --> yswsii:::yourState\n    [*] --> SomeOtherState\n    SomeOtherState --> YetAnotherState\n    yswsii --> YetAnotherState\n    YetAnotherState --> [*]\n",
          sha256: "7b7ab5b3a5f94babdd1e75b687ed07a05b0438c79d37d272f96c55d7f905086b",
          cjk: false,
        },
      ],
    },
    {
      type: "entityRelationshipDiagram",
      name: "Entity Relationship Diagram",
      documentation: "https://mermaid.js.org/syntax/entityRelationshipDiagram.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/entityRelationshipDiagram.md",
      cases: [
        {
          id: "entityRelationshipDiagram/001",
          title: "Entity Relationship Diagrams",
          source:
            "---\ntitle: Order example\n---\nerDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses\n",
          sha256: "973dfeffadbed6ce882050ada2e9747a1049e0d21a31f41ab0123313bb143e72",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/002",
          title: "Entity Relationship Diagrams",
          source:
            "erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    CUSTOMER {\n        string name\n        string custNumber\n        string sector\n    }\n    ORDER ||--|{ LINE-ITEM : contains\n    ORDER {\n        int orderNumber\n        string deliveryAddress\n    }\n    LINE-ITEM {\n        string productCode\n        int quantity\n        float pricePerUnit\n    }\n",
          sha256: "421f7b70668e1fe69e7b60664dc713d1e5ee3cd39cfbcab8feb709e15ddd59ab",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/003",
          title: "With the defaults",
          source:
            'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  PRODUCT ||--o{ LINE_ITEM : "appears in"\n  CUSTOMER {\n    string name\n    string email\n  }\n  ORDER {\n    int id\n    date placedAt\n  }\n  LINE_ITEM {\n    int quantity\n    float price\n  }\n  PRODUCT {\n    string sku\n    string title\n  }\n',
          sha256: "97d409b3f28fbd92d757904245e8ec27cedb64185b577bdbdb5eea74c4ef0182",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/004",
          title: "The previous appearance",
          source:
            '---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nerDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  PRODUCT ||--o{ LINE_ITEM : "appears in"\n  CUSTOMER {\n    string name\n    string email\n  }\n  ORDER {\n    int id\n    date placedAt\n  }\n  LINE_ITEM {\n    int quantity\n    float price\n  }\n  PRODUCT {\n    string sku\n    string title\n  }\n',
          sha256: "28d45c0741343f4e7a4b4910e90fccd80b9f4fd5053a9fe0e58c60854db3e5a2",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/005",
          title: "Unicode text",
          source: 'erDiagram\n    "This ❤ Unicode"\n',
          sha256: "99e1dfb4c158699e33a425420c1e9f3c85fa63c0c2274e46ee393970416065fc",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/006",
          title: "Markdown formatting",
          source: 'erDiagram\n    "This **is** _Markdown_"\n',
          sha256: "d5199c1220398e920a21c5716cb364ac2af1a43d9669072dadce903ab28f6062",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/007",
          title: "Identification",
          source:
            "erDiagram\n    CAR ||--o{ NAMED-DRIVER : allows\n    PERSON }o..o{ NAMED-DRIVER : is\n",
          sha256: "719e355f1c64ad841d58d2a78f8b58654e96ca4c10348c222af8b94322830d19",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/008",
          title: "Identification",
          source:
            "erDiagram\n    CAR 1 to zero or more NAMED-DRIVER : allows\n    PERSON many(0) optionally to 0+ NAMED-DRIVER : is\n",
          sha256: "fff06d91b2ed0ed8aec90a49ac70f9a55b83d12ee2e52dc480b381cf84ed3e3e",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/009",
          title: "Attributes",
          source:
            "erDiagram\n    CAR ||--o{ NAMED-DRIVER : allows\n    CAR {\n        string registrationNumber\n        string make\n        string model\n    }\n    PERSON ||--o{ NAMED-DRIVER : is\n    PERSON {\n        string firstName\n        string lastName\n        int age\n    }\n",
          sha256: "38d6e4a4399d6bef178dd6d0bd0fe1ce0abb141f33a33c09bdef37c6c6edb8bb",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/010",
          title: "Optional attribute types (v11.16.0+)",
          source:
            "erDiagram\n    PERSON {\n        string firstName\n        string? middleName\n        string lastName\n    }\n",
          sha256: "64765bbdf6549438c541e231158026c013e95c99cf9ca0a4dfc0f840ab77bf0d",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/011",
          title: "Entity Name Aliases",
          source:
            'erDiagram\n    p[Person] {\n        string firstName\n        string lastName\n    }\n    a["Customer Account"] {\n        string email\n    }\n    p ||--o| a : has\n',
          sha256: "48baec41314cb4f555a1cf7e444450a6bf0928bc615fff065b2651bacaf98004",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/012",
          title: "Attribute Keys and Comments",
          source:
            'erDiagram\n    CAR ||--o{ NAMED-DRIVER : allows\n    CAR {\n        string registrationNumber PK\n        string make\n        string model\n        string[] parts\n    }\n    PERSON ||--o{ NAMED-DRIVER : is\n    PERSON {\n        string driversLicense PK "The license #"\n        string(99) firstName "Only 99 characters are allowed"\n        string lastName\n        string phone UK\n        int age\n    }\n    NAMED-DRIVER {\n        string carRegistrationNumber PK, FK\n        string driverLicence PK, FK\n    }\n    MANUFACTURER only one to zero or more CAR : makes\n',
          sha256: "0bce57d423be8f2e4dc0d127a4ad45f7ac77f4447c0cde4da9e4993f80833ecf",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/013",
          title: "Direction",
          source:
            "erDiagram\n    direction TB\n    CUSTOMER ||--o{ ORDER : places\n    CUSTOMER {\n        string name\n        string custNumber\n        string sector\n    }\n    ORDER ||--|{ LINE-ITEM : contains\n    ORDER {\n        int orderNumber\n        string deliveryAddress\n    }\n    LINE-ITEM {\n        string productCode\n        int quantity\n        float pricePerUnit\n    }\n",
          sha256: "84744d9ec428f780102ec75a15ff6362d8ac7a275046846abbe53e3c761a68a3",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/014",
          title: "Direction",
          source:
            "erDiagram\n    direction LR\n    CUSTOMER ||--o{ ORDER : places\n    CUSTOMER {\n        string name\n        string custNumber\n        string sector\n    }\n    ORDER ||--|{ LINE-ITEM : contains\n    ORDER {\n        int orderNumber\n        string deliveryAddress\n    }\n    LINE-ITEM {\n        string productCode\n        int quantity\n        float pricePerUnit\n    }\n",
          sha256: "4accb2527f09e89b73929bc3250671e1dfed23c48b027d7f3dc5bea7a80f839a",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/015",
          title: "Subgraphs (v11.17.0+)",
          source:
            "erDiagram\n    subgraph title1\n        CUSTOMER\n        CUSTOMER {\n            string name\n            string custNumber\n            string sector\n        }\n    end\n    subgraph title2\n        CAR ||--o{ NAMED-DRIVER : allows\n        subgraph title3\n            PERSON\n            PERSON {\n                string firstName\n                string lastName\n                int age\n            }\n        end\n    end\n",
          sha256: "7b827b95e8846857dd3a966df201cf4d816cb6c096bc10da176624d1d3f4cc76",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/016",
          title: "Subgraphs (v11.17.0+)",
          source: "erDiagram\n    subgraph title1\n        CUSTOMER\n    end\n",
          sha256: "33d261ba8ae1b6476d9d946a3e3d3a56fa0c712d158b6b36d1c1883bfc776d1e",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/017",
          title: "Subgraphs (v11.17.0+)",
          source: 'erDiagram\n    subgraph "Customer Domain"\n        CUSTOMER\n    end\n',
          sha256: "13b0f9ca3d8532da1b854b626b382297980a7019f96440683a7ea67604b48e8c",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/018",
          title: "Subgraphs (v11.17.0+)",
          source: "erDiagram\n    subgraph id1 [title 1]\n        CUSTOMER\n    end\n",
          sha256: "aef1ac587e4aaaeef1a704048ef96d1bb6966aab28ab228efba2e25d167f303e",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/019",
          title: "Relationships involving subgraphs",
          source:
            "erDiagram\n    subgraph title1\n        A1 ||--|| A2 : links\n    end\n\n    subgraph title2\n        B1 ||--|| B2 : links\n    end\n\n    subgraph title3\n        C1 ||--|| C2 : links\n    end\n\n    title1 ||--|| title2 : links\n    title2 ||--|| title3 : links\n    title2 ||--|| C2 : links\n",
          sha256: "cb5e089f3dc8d91b3570e43970e9153a557a1d48d334dac86d6bd85649f63f46",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/020",
          title: "Direction in subgraphs",
          source:
            "erDiagram\n    direction LR\n    subgraph TOP\n        direction TB\n        subgraph B1\n            direction RL\n            I1 ||--|| F1 : links\n        end\n        subgraph B2\n            direction BT\n            I2 ||--|| F2 : links\n        end\n    end\n    A ||--|| TOP : links\n    TOP ||--|| B : links\n    B1 ||--|| B2 : links\n",
          sha256: "3bffcd114da1c5a6980c020179162ba125096cb977086df39d7feb5263738300",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/021",
          title: "Styling a node",
          source:
            "erDiagram\n    id1||--||id2 : label\n    style id1 fill:#f9f,stroke:#333,stroke-width:4px\n    style id2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5\n",
          sha256: "2090df21742496c161f7b62d552672c9dda82dc99e6121c9489e2cd96d7be7e4",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/022",
          title: "Classes",
          source:
            "erDiagram\n    direction TB\n    CAR:::someclass {\n        string registrationNumber\n        string make\n        string model\n    }\n    PERSON:::someclass {\n        string firstName\n        string lastName\n        int age\n    }\n    HOUSE:::someclass\n\n    classDef someclass fill:#f96\n",
          sha256: "685e5730a5e743fa0fecfbddd1fb0af0ca4354d6981d21a62bebad0a53604151",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/023",
          title: "Classes",
          source:
            "erDiagram\n    CAR {\n        string registrationNumber\n        string make\n        string model\n    }\n    PERSON {\n        string firstName\n        string lastName\n        int age\n    }\n    PERSON:::foo ||--|| CAR : owns\n    PERSON o{--|| HOUSE:::bar : has\n\n    classDef foo stroke:#f00\n    classDef bar stroke:#0f0\n    classDef foobar stroke:#00f\n",
          sha256: "cd17cfb2345a33fbc8360bcaacc9ea2ed7ebb273293691416cff75824273c3ed",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/024",
          title: "Default class",
          source:
            "erDiagram\n    CAR {\n        string registrationNumber\n        string make\n        string model\n    }\n    PERSON {\n        string firstName\n        string lastName\n        int age\n    }\n    PERSON:::foo ||--|| CAR : owns\n    PERSON o{--|| HOUSE:::bar : has\n\n    classDef default fill:#f9f,stroke-width:4px\n    classDef foo stroke:#f00\n    classDef bar stroke:#0f0\n    classDef foobar stroke:#00f\n",
          sha256: "1838b7a479e5110008e068a1f1f4ef1cb1f2b5629ec2101180e5370cc4d223cf",
          cjk: false,
        },
        {
          id: "entityRelationshipDiagram/025",
          title: "Layout",
          source:
            "---\ntitle: Order example\nconfig:\n    layout: dagre\n---\nerDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses\n",
          sha256: "59995f5cd6f4cfc711587362e7320b1812ae61e17af7981db658fab052aa243d",
          cjk: false,
        },
      ],
    },
    {
      type: "userJourney",
      name: "User Journey",
      documentation: "https://mermaid.js.org/syntax/userJourney.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/userJourney.md",
      cases: [
        {
          id: "userJourney/001",
          title: "User Journey Diagram",
          source:
            "journey\n    title My working day\n    section Go to work\n      Make tea: 5: Me\n      Go upstairs: 3: Me\n      Do work: 1: Me, Cat\n    section Go home\n      Go downstairs: 5: Me\n      Sit down: 5: Me\n",
          sha256: "e978837ae6de4a8b5c7831489dc68a9f8fe20d5d9b7514016207af832f687bdd",
          cjk: false,
        },
      ],
    },
    {
      type: "gantt",
      name: "Gantt",
      documentation: "https://mermaid.js.org/syntax/gantt.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/gantt.md",
      cases: [
        {
          id: "gantt/001",
          title: "A note to users",
          source:
            "gantt\n    title A Gantt Diagram\n    dateFormat YYYY-MM-DD\n    section Section\n        A task          :a1, 2014-01-01, 30d\n        Another task    :after a1, 20d\n    section Another\n        Task in Another :2014-01-12, 12d\n        another task    :24d\n",
          sha256: "9994b276372df6ec8dece5afd5a93326bf86e01f4e6574ed3e6c1fb052805144",
          cjk: false,
        },
        {
          id: "gantt/002",
          title: "Syntax",
          source:
            'gantt\n    dateFormat  YYYY-MM-DD\n    title       Adding GANTT diagram functionality to mermaid\n    excludes    weekends\n    %% (`excludes` accepts specific dates in YYYY-MM-DD format, days of the week ("sunday") or "weekends", but not the word "weekdays".)\n\n    section A section\n    Completed task            :done,    des1, 2014-01-06,2014-01-08\n    Active task               :active,  des2, 2014-01-09, 3d\n    Future task               :         des3, after des2, 5d\n    Future task2              :         des4, after des3, 5d\n\n    section Critical tasks\n    Completed task in the critical line :crit, done, 2014-01-06,24h\n    Implement parser and jison          :crit, done, after des1, 2d\n    Create tests for parser             :crit, active, 3d\n    Future task in critical line        :crit, 5d\n    Create tests for renderer           :2d\n    Add to mermaid                      :until isadded\n    Functionality added                 :milestone, isadded, 2014-01-25, 0d\n\n    section Documentation\n    Describe gantt syntax               :active, a1, after des1, 3d\n    Add gantt diagram to demo page      :after a1  , 20h\n    Add another diagram to demo page    :doc1, after a1  , 48h\n\n    section Last section\n    Describe gantt syntax               :after doc1, 3d\n    Add gantt diagram to demo page      :20h\n    Add another diagram to demo page    :48h\n',
          sha256: "b854a6f49b60d20009c5c1b080f95308caa3b824add35a16afa3376699d40974",
          cjk: false,
        },
        {
          id: "gantt/003",
          title: "Duration format",
          source:
            "gantt\n    apple :a, 2017-07-20, 1w\n    banana :crit, b, 2017-07-23, 1d\n    cherry :active, c, after b a, 1d\n    kiwi   :d, 2017-07-20, until b c\n",
          sha256: "c79e89c00972e73feed619283cf73b47d7912b38629c94c98a2b838f5fa114ca",
          cjk: false,
        },
        {
          id: "gantt/004",
          title: "Weekend (v\\11.0.0+)",
          source:
            "gantt\n    title A Gantt Diagram Excluding Fri - Sat weekends\n    dateFormat YYYY-MM-DD\n    excludes weekends\n    weekend friday\n    section Section\n        A task          :a1, 2024-01-01, 30d\n        Another task    :after a1, 20d\n",
          sha256: "908a1947f25e930bfcb64a89d39c110da43236253cc707c09684ae9cab0b52d6",
          cjk: false,
        },
        {
          id: "gantt/005",
          title: "Milestones",
          source:
            "gantt\n    dateFormat HH:mm\n    axisFormat %H:%M\n    Initial milestone : milestone, m1, 17:49, 2m\n    Task A : 10m\n    Task B : 5m\n    Final milestone : milestone, m2, 18:08, 4m\n",
          sha256: "4cd3811ad968ce17a7b7f577f05a53e12d04ecdccd194ce83014908735e4f239",
          cjk: false,
        },
        {
          id: "gantt/006",
          title: "Vertical Markers",
          source:
            "gantt\n    dateFormat HH:mm\n    axisFormat %H:%M\n    Initial vert : vert, v1, 17:30, 2m\n    Task A : 3m\n    Task B : 8m\n    Final vert : vert, v2, 17:58, 4m\n",
          sha256: "9bf761ee7c35a4d8e18488ce44556079b0fffa80c8a7d17d39ee17a0c61ff7aa",
          cjk: false,
        },
        {
          id: "gantt/007",
          title: "Axis ticks (v10.3.0+)",
          source: "gantt\n  tickInterval 1week\n  weekday monday\n",
          sha256: "b651c090529ba2c6f4e065203d75ffb3f4638219d65b2474c41082ca106319d7",
          cjk: false,
        },
        {
          id: "gantt/008",
          title: "Output in compact mode",
          source:
            "---\ndisplayMode: compact\n---\ngantt\n    title A Gantt Diagram\n    dateFormat  YYYY-MM-DD\n\n    section Section\n    A task           :a1, 2014-01-01, 30d\n    Another task     :a2, 2014-01-20, 25d\n    Another one      :a3, 2014-02-10, 20d\n",
          sha256: "c4f89c3ee4131419101aa1ca6684cf744bb9aa4629e21b166d4f5986b57b2208",
          cjk: false,
        },
        {
          id: "gantt/009",
          title: "Comments",
          source:
            "gantt\n    title A Gantt Diagram\n    %% This is a comment\n    dateFormat YYYY-MM-DD\n    section Section\n        A task          :a1, 2014-01-01, 30d\n        Another task    :after a1, 20d\n    section Another\n        Task in Another :2014-01-12, 12d\n        another task    :24d\n",
          sha256: "caed15f5cf495e6437ceac69632d051af954f4b22f542e84a303b4c8773e8199",
          cjk: false,
        },
        {
          id: "gantt/010",
          title: "Bar chart (using gantt chart)",
          source:
            "gantt\n    title Git Issues - days since last update\n    dateFormat X\n    axisFormat %s\n    section Issue19062\n    71   : 0, 71\n    section Issue19401\n    36   : 0, 36\n    section Issue193\n    34   : 0, 34\n    section Issue7441\n    9    : 0, 9\n    section Issue1300\n    5    : 0, 5\n",
          sha256: "eb63c5df30e42f5dc227960799541b109098ded42e3330eae494d6eeb07d890b",
          cjk: false,
        },
        {
          id: "gantt/011",
          title: "Timeline (with comments, CSS, config in frontmatter)",
          source:
            "---\n    # Frontmatter config, YAML comments\n    title: Ignored if specified in chart\n    displayMode: compact     #gantt specific setting but works at this level too\n    config:\n#        theme: forest\n#        themeCSS: \" #item36 { fill: CadetBlue } \"\n        themeCSS: \" // YAML supports multiline strings using a newline markers: \\n\n            #item36 { fill: CadetBlue }       \\n\n\n            // Custom marker workaround CSS from forum (below)    \\n\n            rect[id^=workaround] { height: calc(100% - 50px) ; transform: translate(9px, 25px); y: 0; width: 1.5px; stroke: none; fill: red; }   \\n\n            text[id^=workaround] { fill: red; y: 100%; font-size: 15px;}\n        \"\n        gantt:\n            useWidth: 400\n            rightPadding: 0\n            topAxis: true  #false\n            numberSectionStyles: 2\n---\ngantt\n    title Timeline - Gantt Sampler\n    dateFormat YYYY\n    axisFormat %y\n    %% this next line doesn't recognise 'decade' or 'year', but will silently ignore\n    tickInterval 1decade\n\n    section Issue19062\n    71   :            item71, 1900, 1930\n    section Issue19401\n    36   :            item36, 1913, 1935\n    section Issue1300\n    94   :            item94, 1910, 1915\n    5    :            item5,  1920, 1925\n    0    : milestone, item0,  1918, 1s\n    9    : vert,              1906, 1s   %% not yet official\n    64   : workaround,        1923, 1s   %% custom CSS object https://github.com/mermaid-js/mermaid/issues/3250\n",
          sha256: "15ddee045061b8dfc286609f16abd649f7cb7816cae2b2d578c6527447eec1dc",
          cjk: false,
        },
      ],
    },
    {
      type: "pie",
      name: "Pie Chart",
      documentation: "https://mermaid.js.org/syntax/pie.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/pie.md",
      cases: [
        {
          id: "pie/001",
          title: "Pie chart diagrams",
          source:
            'pie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15\n',
          sha256: "f41484cd94dd84837056db4c681ce6119f533b643bed745c58116553acdebf27",
          cjk: false,
        },
        {
          id: "pie/002",
          title: "Example",
          source:
            '---\nconfig:\n  pie:\n    textPosition: 0.5\n    donutHole: 0.2\n    highlightSlice: Potassium\n  themeVariables:\n    pieOuterStrokeWidth: "5px"\n---\npie showData\n    title Key elements in Product X\n    "Calcium" : 42.96\n    "Potassium" : 50.05\n    "Magnesium" : 10.01\n    "Iron" :  5\n',
          sha256: "0618966cc9f61ec49975b0a1b5a9c0e3332461984a633de203a50897cc7b3bfc",
          cjk: false,
        },
      ],
    },
    {
      type: "quadrantChart",
      name: "Quadrant Chart",
      documentation: "https://mermaid.js.org/syntax/quadrantChart.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/quadrantChart.md",
      cases: [
        {
          id: "quadrantChart/001",
          title: "Example",
          source:
            "quadrantChart\n    title Reach and engagement of campaigns\n    x-axis Low Reach --> High Reach\n    y-axis Low Engagement --> High Engagement\n    quadrant-1 We should expand\n    quadrant-2 Need to promote\n    quadrant-3 Re-evaluate\n    quadrant-4 May be improved\n    Campaign A: [0.3, 0.6]\n    Campaign B: [0.45, 0.23]\n    Campaign C: [0.57, 0.69]\n    Campaign D: [0.78, 0.34]\n    Campaign E: [0.40, 0.34]\n    Campaign F: [0.35, 0.78]\n",
          sha256: "19ab9ebf1e76dde2af0aaea8d8cae3929cdd1efc149fd887c40faceb8c0b45e4",
          cjk: false,
        },
        {
          id: "quadrantChart/002",
          title: "Example on config and theme",
          source:
            '---\nconfig:\n  quadrantChart:\n    chartWidth: 400\n    chartHeight: 400\n  themeVariables:\n    quadrant1TextFill: "ff0000"\n---\nquadrantChart\n  x-axis Urgent --> Not Urgent\n  y-axis Not Important --> "Important ❤"\n  quadrant-1 Plan\n  quadrant-2 Do\n  quadrant-3 Delegate\n  quadrant-4 Delete\n',
          sha256: "ba45a7442b75146ffb8ccbdedb892d5137b55dcc7492433e83d21fc576b65662",
          cjk: false,
        },
        {
          id: "quadrantChart/003",
          title: "Example on styling",
          source:
            "quadrantChart\n  title Reach and engagement of campaigns\n  x-axis Low Reach --> High Reach\n  y-axis Low Engagement --> High Engagement\n  quadrant-1 We should expand\n  quadrant-2 Need to promote\n  quadrant-3 Re-evaluate\n  quadrant-4 May be improved\n  Campaign A: [0.9, 0.0] radius: 12\n  Campaign B:::class1: [0.8, 0.1] color: #ff3300, radius: 10\n  Campaign C: [0.7, 0.2] radius: 25, color: #00ff33, stroke-color: #10f0f0\n  Campaign D: [0.6, 0.3] radius: 15, stroke-color: #00ff0f, stroke-width: 5px ,color: #ff33f0\n  Campaign E:::class2: [0.5, 0.4]\n  Campaign F:::class3: [0.4, 0.5] color: #0000ff\n  classDef class1 color: #109060\n  classDef class2 color: #908342, radius : 10, stroke-color: #310085, stroke-width: 10px\n  classDef class3 color: #f00fff, radius : 10\n",
          sha256: "cb0348713c1706e9b525fee554beb25cf4c1ae71cafeffdf05e34e8bb62b6bf6",
          cjk: false,
        },
      ],
    },
    {
      type: "requirementDiagram",
      name: "Requirement Diagram",
      documentation: "https://mermaid.js.org/syntax/requirementDiagram.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/requirementDiagram.md",
      cases: [
        {
          id: "requirementDiagram/001",
          title: "Requirement Diagram",
          source:
            "    requirementDiagram\n\n    requirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n    }\n\n    element test_entity {\n    type: simulation\n    }\n\n    test_entity - satisfies -> test_req\n",
          sha256: "7919bd6c635cc68d8a8b86f72a64f21a6096c8f567708424a49b7ccccd96eb83",
          cjk: false,
        },
        {
          id: "requirementDiagram/002",
          title: "With the defaults",
          source:
            "requirementDiagram\n  requirement checkout_req {\n    id: 1\n    text: Orders must be payable online.\n    risk: high\n    verifymethod: test\n  }\n  functionalRequirement payment_req {\n    id: 1.1\n    text: Card payments must be authorised.\n    risk: high\n    verifymethod: test\n  }\n  element checkout_service {\n    type: service\n  }\n  checkout_req - contains -> payment_req\n  checkout_service - satisfies -> payment_req\n",
          sha256: "344e64eb9718eff08df3efe403d7a82f0b7c780cd558f573dfe52e9ad04c97fc",
          cjk: false,
        },
        {
          id: "requirementDiagram/003",
          title: "The previous appearance",
          source:
            "---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nrequirementDiagram\n  requirement checkout_req {\n    id: 1\n    text: Orders must be payable online.\n    risk: high\n    verifymethod: test\n  }\n  functionalRequirement payment_req {\n    id: 1.1\n    text: Card payments must be authorised.\n    risk: high\n    verifymethod: test\n  }\n  element checkout_service {\n    type: service\n  }\n  checkout_req - contains -> payment_req\n  checkout_service - satisfies -> payment_req\n",
          sha256: "7d0dd6187502e6a8ec4d412cc5da0ee5412e57b5688621e09632f4fd7a19de21",
          cjk: false,
        },
        {
          id: "requirementDiagram/004",
          title: "Markdown Formatting",
          source:
            'requirementDiagram\n\nrequirement "__test_req__" {\n    id: 1\n    text: "*italicized text* **bold text**"\n    risk: high\n    verifymethod: test\n}\n',
          sha256: "6aee0ba9c47a09ff640c89824038ce73be3c7db8e10aab8ce0b0a02f36866a80",
          cjk: false,
        },
        {
          id: "requirementDiagram/005",
          title: "Larger Example",
          source:
            '    requirementDiagram\n\n    requirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n    }\n\n    functionalRequirement test_req2 {\n    id: 1.1\n    text: the second test text.\n    risk: low\n    verifymethod: inspection\n    }\n\n    performanceRequirement test_req3 {\n    id: 1.2\n    text: the third test text.\n    risk: medium\n    verifymethod: demonstration\n    }\n\n    interfaceRequirement test_req4 {\n    id: 1.2.1\n    text: the fourth test text.\n    risk: medium\n    verifymethod: analysis\n    }\n\n    physicalRequirement test_req5 {\n    id: 1.2.2\n    text: the fifth test text.\n    risk: medium\n    verifymethod: analysis\n    }\n\n    designConstraint test_req6 {\n    id: 1.2.3\n    text: the sixth test text.\n    risk: medium\n    verifymethod: analysis\n    }\n\n    element test_entity {\n    type: simulation\n    }\n\n    element test_entity2 {\n    type: word doc\n    docRef: reqs/test_entity\n    }\n\n    element test_entity3 {\n    type: "test suite"\n    docRef: github.com/all_the_tests\n    }\n\n\n    test_entity - satisfies -> test_req2\n    test_req - traces -> test_req2\n    test_req - contains -> test_req3\n    test_req3 - contains -> test_req4\n    test_req4 - derives -> test_req5\n    test_req5 - refines -> test_req6\n    test_entity3 - verifies -> test_req5\n    test_req <- copies - test_entity2\n',
          sha256: "b9d0e63b6c8ae8164ff63beb6ec2a7a9f66c677f6131d88562b5dcc7db5e8880",
          cjk: false,
        },
        {
          id: "requirementDiagram/006",
          title: "Direction",
          source:
            "requirementDiagram\n\ndirection LR\n\nrequirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n}\n\nelement test_entity {\n    type: simulation\n}\n\ntest_entity - satisfies -> test_req\n",
          sha256: "4bff091ab718b957ce1a1c2960676f6feed8121dd48e1b550466524b7407eee0",
          cjk: false,
        },
        {
          id: "requirementDiagram/007",
          title: "Direct Styling",
          source:
            "requirementDiagram\n\nrequirement test_req {\n    id: 1\n    text: styling example\n    risk: low\n    verifymethod: test\n}\n\nelement test_entity {\n    type: simulation\n}\n\nstyle test_req fill:#ffa,stroke:#000, color: green\nstyle test_entity fill:#f9f,stroke:#333, color: blue\n",
          sha256: "eead694e962481bfc0dd649985ea9fd27dd372de97efcb9cb5df5821408c782e",
          cjk: false,
        },
        {
          id: "requirementDiagram/008",
          title: "Class Definitions",
          source:
            'requirementDiagram\n\nrequirement test_req {\n    id: 1\n    text: "class styling example"\n    risk: low\n    verifymethod: test\n}\n\nelement test_entity {\n    type: simulation\n}\n\nclassDef important fill:#f96,stroke:#333,stroke-width:4px\nclassDef test fill:#ffa,stroke:#000\n',
          sha256: "fe43760d819f1555725c96b6876fdb729ea81cd07f1d753fb4073dbad52b873b",
          cjk: false,
        },
        {
          id: "requirementDiagram/009",
          title: "Combined Example",
          source:
            'requirementDiagram\n\nrequirement test_req:::important {\n    id: 1\n    text: "class styling example"\n    risk: low\n    verifymethod: test\n}\n\nelement test_entity {\n    type: simulation\n}\n\nclassDef important font-weight:bold\n\nclass test_entity important\nstyle test_entity fill:#f9f,stroke:#333\n',
          sha256: "20800df0cf5254ab5c8f84b468897461c3e90048a70a1a55614726d362489bb3",
          cjk: false,
        },
      ],
    },
    {
      type: "usecase",
      name: "Use Case Diagram",
      documentation: "https://mermaid.js.org/syntax/usecase.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/usecase.md",
      cases: [
        {
          id: "usecase/001",
          title: "Use case diagrams (12.0.0+)",
          source:
            'usecase-beta\ndirection LR\nactor Customer("Customer")\nsystemBoundary "Order system"\n  Checkout("Place order")\nend\nCustomer --> Checkout\n',
          sha256: "00339c496aec5a45f8f5caf77b60b01088186cac9d7fdf4773d046e5d289bc46",
          cjk: false,
        },
        {
          id: "usecase/002",
          title: "With the defaults",
          source:
            'usecase-beta\ndirection LR\nactor Customer\nactor Support\nsystemBoundary Storefront\n  Browse("Browse catalogue")\n  Checkout("Checkout")\nend\nsystemBoundary Fulfilment\n  Track("Track delivery")\nend\nCustomer --> Browse\nCustomer --> Checkout\nCustomer --> Track\nSupport --> Track\nCheckout ..> : include Browse\n',
          sha256: "1c58ec981dc2f11e1856ace6c9fdf478ab247087956e0b8468c6fe6030d68082",
          cjk: false,
        },
        {
          id: "usecase/003",
          title: "The previous appearance",
          source:
            '---\nconfig:\n  theme: default\n  look: classic\n  layout: dagre\n---\nusecase-beta\ndirection LR\nactor Customer\nactor Support\nsystemBoundary Storefront\n  Browse("Browse catalogue")\n  Checkout("Checkout")\nend\nsystemBoundary Fulfilment\n  Track("Track delivery")\nend\nCustomer --> Browse\nCustomer --> Checkout\nCustomer --> Track\nSupport --> Track\nCheckout ..> : include Browse\n',
          sha256: "3706b150f6b68e125a13b24cd6d4b90ac050f1b4fdb77cf4e75cebf82fc0afb0",
          cjk: false,
        },
        {
          id: "usecase/004",
          title: "Actors and use cases",
          source:
            'usecase-beta\nCustomer --> Login\nactor Customer\nactor Admin("Main administrator")\nLogin("Sign in")\nReport[Generate report]\n"Reset password"\nAdmin --> Report\n',
          sha256: "602930284299ce28fd6c376be31184eda853ccc75a6f0fa63a751bb971f85094",
          cjk: false,
        },
        {
          id: "usecase/005",
          title: "Actor variants",
          source:
            'usecase-beta\nactor Normal("Normal actor")\nactor Hollow("Hollow actor")@{ type: hollow }\nactor Awesome("Awesome actor")@{ type: awesome }\nactor Icon("Registered icon")@{ icon: "fa:user" }\nactor Fallback("Missing icon fallback")@{ icon: "not-registered:user" }\nNormal --> Manage\nHollow --> Manage\nAwesome --> Manage\nIcon --> Manage\nFallback --> Manage\n',
          sha256: "512322076f2110a9ab4e3c35ac0ab7467ef1da90c5d6436140bff49f1f7cbd07",
          cjk: false,
        },
        {
          id: "usecase/006",
          title: "Business elements and stereotypes",
          source:
            'usecase-beta\nactor SalesAgent("Sales agent")@{ business: true } <<Employee>>\nactor Broker@{ type: hollow, business: true }\nQuote("Prepare quote")@{ business: true } <<Core>>\nArchive[Archive quote] <<Record>>\nSalesAgent --> Quote\nBroker --> Quote\nQuote --> Archive\n',
          sha256: "5e2ceaa9a657fdc265a773b88450996615c1d7cde6c96448cb0f313529f8aec4",
          cjk: false,
        },
        {
          id: "usecase/007",
          title: "Labels",
          source:
            "usecase-beta\nactor Analyst(*Analyst*)\nLiteral(**Literal markers**)\nPriced[Costs 19.95 EUR — VAT included!]\nAnalyst -- files R&D report --> Literal\nAnalyst --> Priced\n",
          sha256: "e30205185984ab8a93c1f67ded3430d8c1e0ed5371e31ad47ce3cb8f24841ad1",
          cjk: false,
        },
        {
          id: "usecase/008",
          title: "Labels",
          source:
            'usecase-beta\nactor Reviewer("`*Reviewer*`")\nLiteral("**Literal markers**")\nFormatted("`**Formatted label**\nwith a physical line break`")\nQuoted("Show #quot;quoted#quot; text")\nReviewer -- "`opens **form**`" --> Formatted\nReviewer --> Literal\nReviewer --> Quoted\n',
          sha256: "cc7884f2722a02607d0942262daddfdef1b9ea0c9763d3b181a8a028487f4364",
          cjk: false,
        },
        {
          id: "usecase/009",
          title: "Lines and comments",
          source:
            "usecase-beta\n%% Actors are declared explicitly.\nactor User\n\n%% Each relationship is a separate statement.\nUser --> Login\nLogin --> Dashboard\n",
          sha256: "2b04d71e8026a82fc6a90ad8d93111c9420235a5d7a40cd8d419e6c470ebf27b",
          cjk: false,
        },
        {
          id: "usecase/010",
          title: "System boundaries",
          source:
            'usecase-beta\nsystemBoundary sb1["Payment service"]@{ type: package }:::system\n  actor Clerk("Payment clerk")\n  Authorize("Authorize payment")\n  Receipt[Create receipt]\nend\nClerk --> Authorize\nAuthorize --> Receipt\nclassDef system stroke:#4b4b7a\n',
          sha256: "b4b9e11d329da958d48fa139faa67236df6a49a4904a3cf93f0c8d51d6b73bc4",
          cjk: false,
        },
        {
          id: "usecase/011",
          title: "System boundaries",
          source:
            'usecase-beta\nsystemBoundary "Payment service"\n  actor Clerk("Payment clerk")\n  Authorize("Authorize payment")\nend\nPayment_service@{ type: package }\nClerk --> Authorize\n',
          sha256: "2d94b58bf0c1709c9fff10a49dee0e1cd1201901ae305443f04340fa6282c80b",
          cjk: false,
        },
        {
          id: "usecase/012",
          title: "Associations",
          source:
            "usecase-beta\nactor User\nactor Support\nStart\nFinish\nUser --> Start\nStart <-- Support\nStart -- Finish\nUser --o Start\nStart o-- Support\nUser --x Finish\nFinish x-- Support\n",
          sha256: "d4aaab4d50a96bf6041777ec6bc692272ae2dc2f5012262adb636c18f83052ce",
          cjk: false,
        },
        {
          id: "usecase/013",
          title: "Associations",
          source: 'usecase-beta\nactor User\nLogin\nUser -- "include account details" --> Login\n',
          sha256: "05f26a014a27f80ae3f2cb164571e203af6b573a570198a200f42aafb68b3ffe",
          cjk: false,
        },
        {
          id: "usecase/014",
          title: "Include, extend, and generalization",
          source:
            "usecase-beta\nactor Admin\nactor Person\nCheckout\nPayment\nApplyCoupon\nAdmin --|> Person\nCheckout ..> : include Payment\nApplyCoupon ..> : extend Checkout\nApplyCoupon --|> Checkout\n",
          sha256: "9cb66c38e51b5a4d4c1df093ab10bd1d29dfd87a17df32adeda57d9e30dcbb33",
          cjk: false,
        },
        {
          id: "usecase/015",
          title: "Edge IDs, styles, animation, and length",
          source:
            'usecase-beta\nactor Customer\nCheckout\nPayment\nCustomer opens@-- "starts checkout" ---> Checkout\nCheckout payment@..> : include Payment\nclassDef emphasized stroke:#d33,stroke-width:3px\nclass opens,payment emphasized\nstyle opens stroke:#06c,stroke-width:4px\nopens@{ animation: fast }\npayment@{ animate: false }\n',
          sha256: "5b4f68379af67286393c263396555c7306309d01a38545bcb01eac8953632995",
          cjk: false,
        },
        {
          id: "usecase/016",
          title: "Notes",
          source:
            'usecase-beta\nnote for Login "`Requires an **active session**`"\nnote for User "Starts the workflow"\nactor User\nLogin("Sign in")\nUser --> Login\n',
          sha256: "ddec036429b837799e8f06afee06ca9a14aab1b0f54138fddec561d3667276fb",
          cjk: false,
        },
        {
          id: "usecase/017",
          title: "JSON tables",
          source:
            'usecase-beta\nInspect("Inspect payload")\njson Payload@{\n  "2": "second in source",\n  "1": "first after 2",\n  "enabled": true,\n  "count": 3,\n  "missing": null,\n  "colors": ["Red", "Green"],\n  "address": { "city": "Oslo" },\n  "items": [{ "name": "Book" }],\n  "emptyObject": {},\n  "emptyArray": []\n}:::data\nInspect --> Payload\nclassDef data stroke:#3572a5\nstyle Payload stroke-width:2px\n',
          sha256: "a77aca89d95cdd7fd2ac51454a5764daa0ba60cdbda83d5d2ceaaa163ac48c54",
          cjk: false,
        },
        {
          id: "usecase/018",
          title: "Styling",
          source:
            'usecase-beta\nactor Customer:::external\nCheckout("Checkout"):::critical\nsystemBoundary Account\n  Profile[Edit profile]\nend\njson Session@{ "active": true }:::data\nCustomer --> Checkout\nCheckout --> Profile\nProfile --> Session\nclassDef default stroke:#7f8ea3\nclassDef external,critical stroke-width:3px\nclass Customer,Checkout external,critical\nclass Account,Session data\nstyle Checkout stroke:#c33,stroke-width:4px\nstyle Account stroke:#536878\n',
          sha256: "d30527c997c57b1567c8864fee018c7251f4f53020f8f85114d9fd7337bf6d62",
          cjk: false,
        },
        {
          id: "usecase/019",
          title: "Colors",
          source:
            '---\nconfig:\n  theme: redux-color\n---\nusecase-beta\ndirection LR\nactor Customer\nsystemBoundary Catalogue\n  Browse("Browse catalogue")\nend\nsystemBoundary Payment\n  Checkout("Checkout")\nend\nCustomer --> Browse\nBrowse --> Checkout\nCheckout ..> : include Browse\n',
          sha256: "9f28c6340d44d92b81ca481f9a19c89a50822f1be0f4fde52e3e188ca19d8999",
          cjk: false,
        },
        {
          id: "usecase/020",
          title: "Per-element colour rotation",
          source:
            '---\nconfig:\n  theme: redux-color\n  usecase:\n    colorScheme: rotate\n---\nusecase-beta\ndirection LR\nactor Customer\nactor Auditor\nBrowse("Browse catalogue")\nCheckout("Checkout")\nCustomer --> Browse\nBrowse --> Checkout\nAuditor --> Checkout\n',
          sha256: "b59e41d6c3ba23c6711c4df43423f7ebc52ec6d3caefb37d6fafb5800276a72d",
          cjk: false,
        },
        {
          id: "usecase/021",
          title: "Configuration",
          source:
            '---\nconfig:\n  usecase:\n    actorFontSize: 16\n    actorFontFamily: Arial\n    actorFontWeight: bold\n    usecaseFontSize: 14\n    usecaseFontFamily: Georgia\n    usecaseFontWeight: normal\n    nodeSpacing: 60\n    rankSpacing: 70\n    diagramPadding: 24\n    colorScheme: role\n    useMaxWidth: false\n---\nusecase-beta\ndirection LR\nactor Customer\nBrowse("Browse catalog")\nCustomer --> Browse\n',
          sha256: "38e641131baa170758528c711e49193e862a4146835785c093013682c11bce72",
          cjk: false,
        },
        {
          id: "usecase/022",
          title: "Accessibility",
          source:
            'usecase-beta\naccTitle: Account access use cases\naccDescr {\n  A customer signs in and can reset a password.\n  The diagram names the actor, use cases, and associations.\n}\nactor Customer\nSignIn("Sign in")\nReset("Reset password")\nCustomer --> SignIn\nCustomer --> Reset\n',
          sha256: "d2ecf4a337d37930b1eeaa5215015e31faeb0795697be8034ad8d5afb606d9bd",
          cjk: false,
        },
        {
          id: "usecase/023",
          title: "Complete example",
          source:
            'usecase-beta\ndirection LR\naccTitle: Online ordering use cases\naccDescr {\n  A customer places an order through the storefront.\n  Staff review the order and inspect its data.\n}\nactor Customer("Customer")\nactor Staff("Order staff")@{ type: hollow, business: true } <<Employee>>\nsystemBoundary ordering["Ordering System"]@{ type: package }:::system\n  Browse("Browse products")\n  Checkout("Checkout") <<Core>>:::critical\n  Payment("Process payment")\n  Review[Review order]\nend\njson OrderData@{\n  "status": "pending",\n  "items": [{ "name": "Book", "quantity": 1 }],\n  "total": 29.95\n}:::data\nnote for Checkout "`Validates the **cart** before payment`"\nCustomer starts@-- "places order" ---> Checkout\nCustomer --> Browse\nCheckout pays@..> : include Payment\nStaff --> Review\nReview --> OrderData\nclassDef system stroke:#c8a02a,stroke-width:2px\nclassDef critical stroke:#c33,stroke-width:3px\nclassDef data stroke:#3572a5\nstarts@{ animation: fast }\nstyle pays stroke:#6b46c1,stroke-width:2px\n',
          sha256: "e4fb4f72cd84fab78673e2b844b78727eab6143008b3fcdf4d85d7cbfb126070",
          cjk: false,
        },
        {
          id: "usecase/024",
          title: "Constructs that parse but mean something else",
          source:
            'usecase-beta\nactor Customer\nReset("`Reset\npassword`")\nRefund("Refund #40;partial#41;")\nCustomer --> Reset\nCustomer --> Refund\n',
          sha256: "ad6a3a578b0f599b315a6d705db8f098f6f3a7ddcd43bb892a067e4624fbbf91",
          cjk: false,
        },
      ],
    },
    {
      type: "gitgraph",
      name: "GitGraph (Git) Diagram",
      documentation: "https://mermaid.js.org/syntax/gitgraph.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/gitgraph.md",
      cases: [
        {
          id: "gitgraph/001",
          title: "GitGraph Diagrams",
          source:
            "---\ntitle: Example Git diagram\n---\ngitGraph\n   commit\n   commit\n   branch develop\n   checkout develop\n   commit\n   commit\n   checkout main\n   merge develop\n   commit\n   commit\n",
          sha256: "d28b30afdeb64f8443a454a3406b72c78bf84bb28aba1de21b112a4cfc82e276",
          cjk: false,
        },
        {
          id: "gitgraph/002",
          title: "Syntax",
          source: "    gitGraph\n       commit\n       commit\n       commit\n",
          sha256: "37651ecf35070f3d93d51df75c6c6628825d7f35441f2115f9813b3593d67a9e",
          cjk: false,
        },
        {
          id: "gitgraph/003",
          title: "Adding custom commit id",
          source:
            '    gitGraph\n       commit id: "Alpha"\n       commit id: "Beta"\n       commit id: "Gamma"\n',
          sha256: "014ef174b0d395b73f37e357a49fc9fae30fdbb5014fd8acf3aa22086ea57d60",
          cjk: false,
        },
        {
          id: "gitgraph/004",
          title: "Modifying commit type",
          source:
            '    gitGraph\n       commit id: "Normal"\n       commit\n       commit id: "Reverse" type: REVERSE\n       commit\n       commit id: "Highlight" type: HIGHLIGHT\n       commit\n',
          sha256: "c86bfe00a1c3a2844286b412f72363cce3f3de6940e3d6712b46e11e1d642d60",
          cjk: false,
        },
        {
          id: "gitgraph/005",
          title: "Adding Tags",
          source:
            '    gitGraph\n       commit\n       commit id: "Normal" tag: "v1.0.0"\n       commit\n       commit id: "Reverse" type: REVERSE tag: "RC_1"\n       commit\n       commit id: "Highlight" type: HIGHLIGHT tag: "8.8.4"\n       commit\n',
          sha256: "cc5aab199637d7bc9779fb08a5541b28bb36d74c31feefd86c92323b90fa1baf",
          cjk: false,
        },
        {
          id: "gitgraph/006",
          title: "Create a new branch",
          source:
            "    gitGraph\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       commit\n",
          sha256: "39e8da00bc00c7c6fe6db175f56239bc8f9caf618e9db9621c7a584d01f6f497",
          cjk: false,
        },
        {
          id: "gitgraph/007",
          title: "Checking out an existing branch",
          source:
            "    gitGraph\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       commit\n       checkout main\n       commit\n       commit\n",
          sha256: "ac1b918a3402075d8974d2510ff9d496d9a24ce628dfcac2b9c95712744630cc",
          cjk: false,
        },
        {
          id: "gitgraph/008",
          title: "Merging two branches",
          source:
            "    gitGraph\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       commit\n       checkout main\n       commit\n       commit\n       merge develop\n       commit\n       commit\n",
          sha256: "f6fcc0446da1b8c493d4a44dd0721c181c5921e363c9a1a9e6d7ea6d458b335f",
          cjk: false,
        },
        {
          id: "gitgraph/009",
          title: "Merging two branches",
          source:
            '    gitGraph\n       commit id: "1"\n       commit id: "2"\n       branch nice_feature\n       checkout nice_feature\n       commit id: "3"\n       checkout main\n       commit id: "4"\n       checkout nice_feature\n       branch very_nice_feature\n       checkout very_nice_feature\n       commit id: "5"\n       checkout main\n       commit id: "6"\n       checkout nice_feature\n       commit id: "7"\n       checkout main\n       merge nice_feature id: "customID" tag: "customTag" type: REVERSE\n       checkout very_nice_feature\n       commit id: "8"\n       checkout main\n       commit id: "9"\n',
          sha256: "3347d92631a07bc20f66b9b68b26aad72564d0095230b4f026508e38bf6539e3",
          cjk: false,
        },
        {
          id: "gitgraph/010",
          title: "Cherry Pick commit from another branch",
          source:
            '    gitGraph\n        commit id: "ZERO"\n        branch develop\n        branch release\n        commit id:"A"\n        checkout main\n        commit id:"ONE"\n        checkout develop\n        commit id:"B"\n        checkout main\n        merge develop id:"MERGE"\n        commit id:"TWO"\n        checkout release\n        cherry-pick id:"MERGE" parent:"B"\n        commit id:"THREE"\n        checkout develop\n        commit id:"C"\n',
          sha256: "1e4751fdc7cf19be97f4622875db54c290f904ec07ba68e4f0b12bd88c6d8fa7",
          cjk: false,
        },
        {
          id: "gitgraph/011",
          title: "Hiding Branch names and lines",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n  gitGraph:\n    showBranches: false\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "2b5676bb24021917bba6738e0bdb3e3f0bde1b7ceb6fd8e3dcc702a6c7d54728",
          cjk: false,
        },
        {
          id: "gitgraph/012",
          title: "Commit labels Layout: Rotated or Horizontal",
          source:
            '---\nconfig:\n  logLevel: \'debug\'\n  theme: \'base\'\n  gitGraph:\n    rotateCommitLabel: true\n---\ngitGraph\n  commit id: "feat(api): ..."\n  commit id: "a"\n  commit id: "b"\n  commit id: "fix(client): .extra long label.."\n  branch c2\n  commit id: "feat(modules): ..."\n  commit id: "test(client): ..."\n  checkout main\n  commit id: "fix(api): ..."\n  commit id: "ci: ..."\n  branch b1\n  commit\n  branch b2\n  commit\n',
          sha256: "9db160f1ea2da2a3c60d54563f67ee06ab4aef1be7b03e3c8ee682d5cefe2d24",
          cjk: false,
        },
        {
          id: "gitgraph/013",
          title: "Commit labels Layout: Rotated or Horizontal",
          source:
            '---\nconfig:\n  logLevel: \'debug\'\n  theme: \'base\'\n  gitGraph:\n    rotateCommitLabel: false\n---\ngitGraph\n  commit id: "feat(api): ..."\n  commit id: "a"\n  commit id: "b"\n  commit id: "fix(client): .extra long label.."\n  branch c2\n  commit id: "feat(modules): ..."\n  commit id: "test(client): ..."\n  checkout main\n  commit id: "fix(api): ..."\n  commit id: "ci: ..."\n  branch b1\n  commit\n  branch b2\n  commit\n',
          sha256: "654c165edb80bec82b6b3771db41613f4c6e0cc303d34f2b6d3f69837676556d",
          cjk: false,
        },
        {
          id: "gitgraph/014",
          title: "Hiding commit labels",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n  gitGraph:\n    showBranches: false\n    showCommitLabel: false\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "c24fff4aa6e688a0d4cadce29acfce4b3bb31aa71186fa18b7db0574392af9c7",
          cjk: false,
        },
        {
          id: "gitgraph/015",
          title: "Customizing main branch name",
          source:
            '---\nconfig:\n  logLevel: \'debug\'\n  theme: \'base\'\n  gitGraph:\n    showBranches: true\n    showCommitLabel: true\n    mainBranchName: \'MetroLine1\'\n---\n      gitGraph\n        commit id:"NewYork"\n        commit id:"Dallas"\n        branch MetroLine2\n        commit id:"LosAngeles"\n        commit id:"Chicago"\n        commit id:"Houston"\n        branch MetroLine3\n        commit id:"Phoenix"\n        commit type: HIGHLIGHT id:"Denver"\n        commit id:"Boston"\n        checkout MetroLine1\n        commit id:"Atlanta"\n        merge MetroLine3\n        commit id:"Miami"\n        commit id:"Washington"\n        merge MetroLine2 tag:"MY JUNCTION"\n        commit id:"Boston"\n        commit id:"Detroit"\n        commit type:REVERSE id:"SanFrancisco"\n',
          sha256: "2ea996869e041ddfc44828a6b284b1d67c52d5470d14746fa975632b7e5af975",
          cjk: false,
        },
        {
          id: "gitgraph/016",
          title: "Customizing branch ordering",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n  gitGraph:\n    showBranches: true\n    showCommitLabel: true\n---\n      gitGraph\n      commit\n      branch test1 order: 3\n      branch test2 order: 2\n      branch test3 order: 1\n",
          sha256: "5249bf30205cf685107ca18182a594d86f3ef812f2302679121cac074dca41a0",
          cjk: false,
        },
        {
          id: "gitgraph/017",
          title: "Customizing branch ordering",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n  gitGraph:\n    showBranches: true\n    showCommitLabel: true\n    mainBranchOrder: 2\n---\n      gitGraph\n      commit\n      branch test1 order: 3\n      branch test2\n      branch test3\n      branch test4 order: 1\n",
          sha256: "e5d172db98243b16c21e50adb0775c6dbcc52f3a90d7b671b70eea8d4a7bdf54",
          cjk: false,
        },
        {
          id: "gitgraph/018",
          title: "Left to Right (default, `LR:`)",
          source:
            "    gitGraph LR:\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       checkout main\n       commit\n       commit\n       merge develop\n       commit\n       commit\n",
          sha256: "69f5b8199e78050f8ee7f6adba3cc7818f4e2010b8c2bf376069cd9b58f72aff",
          cjk: false,
        },
        {
          id: "gitgraph/019",
          title: "Top to Bottom (`TB:`)",
          source:
            "    gitGraph TB:\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       checkout main\n       commit\n       commit\n       merge develop\n       commit\n       commit\n",
          sha256: "5a05d6be65b2b58304828252b22202361671ec5ad5dd3352ca62d83fa332441b",
          cjk: false,
        },
        {
          id: "gitgraph/020",
          title: "Bottom to Top (`BT:`) (v11.0.0+)",
          source:
            "    gitGraph BT:\n       commit\n       commit\n       branch develop\n       commit\n       commit\n       checkout main\n       commit\n       commit\n       merge develop\n       commit\n       commit\n",
          sha256: "d143f4d6a3ee24e35a7d9f77bda51860ec8c760fcb04a08fe19a512453666979",
          cjk: false,
        },
        {
          id: "gitgraph/021",
          title: "Temporal Commits (default, `parallelCommits: false`)",
          source:
            "---\nconfig:\n  gitGraph:\n    parallelCommits: false\n---\ngitGraph:\n  commit\n  branch develop\n  commit\n  commit\n  checkout main\n  commit\n  commit\n",
          sha256: "5375a7af420cc1b6cc28f5cc629b1e7dd1a860d55d4e21c8c4097d80d8703ede",
          cjk: false,
        },
        {
          id: "gitgraph/022",
          title: "Parallel commits (`parallelCommits: true`)",
          source:
            "---\nconfig:\n  gitGraph:\n    parallelCommits: true\n---\ngitGraph:\n  commit\n  branch develop\n  commit\n  commit\n  checkout main\n  commit\n  commit\n",
          sha256: "de1e3eeca8d4a60c651ca98c76b37bf6550ed0658b707b04d710eb009bc3b1d3",
          cjk: false,
        },
        {
          id: "gitgraph/023",
          title: "Base Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "2e6d85f337707401a684fcde18f5ef1b69d36a2f297ede7a2b125e0988bb7f4a",
          cjk: false,
        },
        {
          id: "gitgraph/024",
          title: "Forest Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'forest'\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "c71743cecb2dabd79bb3a3cb03598faf94ebf6264d85958ade631187cdae416a",
          cjk: false,
        },
        {
          id: "gitgraph/025",
          title: "The `default` Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n---\n      gitGraph\n        commit type:HIGHLIGHT\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "5e3445f0fc879faa9d96ec83f693ba884e5beedffdfba842a91ada6c68f2fede",
          cjk: false,
        },
        {
          id: "gitgraph/026",
          title: "Dark Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'dark'\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "18580869f46e70b92b94e916fec45d982e8105dddc89f04039b214578b59a53e",
          cjk: false,
        },
        {
          id: "gitgraph/027",
          title: "Neutral Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'neutral'\n---\n      gitGraph\n        commit\n        branch hotfix\n        checkout hotfix\n        commit\n        branch develop\n        checkout develop\n        commit id:\"ash\" tag:\"abc\"\n        branch featureB\n        checkout featureB\n        commit type:HIGHLIGHT\n        checkout main\n        checkout hotfix\n        commit type:NORMAL\n        checkout develop\n        commit type:REVERSE\n        checkout featureB\n        commit\n        checkout main\n        merge hotfix\n        checkout featureB\n        commit\n        checkout develop\n        branch featureA\n        commit\n        checkout develop\n        merge hotfix\n        checkout featureA\n        commit\n        checkout featureB\n        commit\n        checkout develop\n        merge featureA\n        branch release\n        checkout release\n        commit\n        checkout main\n        commit\n        checkout release\n        merge main\n        checkout develop\n        merge release\n",
          sha256: "9ecf12a72dac0389358ae948198e8f4b24d856954475a1e3ccfc5e0f5e3d151d",
          cjk: false,
        },
        {
          id: "gitgraph/028",
          title: "Customize using Theme Variables",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "0dd68e5f46812c9cb0172f42b797897a04fa5e4f8726c3df83b851c3373e136a",
          cjk: false,
        },
        {
          id: "gitgraph/029",
          title: "Customizing branch colors",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n      'git0': '#ff0000'\n      'git1': '#00ff00'\n      'git2': '#0000ff'\n      'git3': '#ff00ff'\n      'git4': '#00ffff'\n      'git5': '#ffff00'\n      'git6': '#ff00ff'\n      'git7': '#00ffff'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "d598a6f6d8055bc88014e4ab98980c19fea7a48c362d273f52ae96e0db84dded",
          cjk: false,
        },
        {
          id: "gitgraph/030",
          title: "Customizing branch label colors",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    'gitBranchLabel0': '#ffffff'\n    'gitBranchLabel1': '#ffffff'\n    'gitBranchLabel2': '#ffffff'\n    'gitBranchLabel3': '#ffffff'\n    'gitBranchLabel4': '#ffffff'\n    'gitBranchLabel5': '#ffffff'\n    'gitBranchLabel6': '#ffffff'\n    'gitBranchLabel7': '#ffffff'\n    'gitBranchLabel8': '#ffffff'\n    'gitBranchLabel9': '#ffffff'\n---\n  gitGraph\n    checkout main\n    branch branch1\n    branch branch2\n    branch branch3\n    branch branch4\n    branch branch5\n    branch branch6\n    branch branch7\n    branch branch8\n    branch branch9\n    checkout branch1\n    commit\n",
          sha256: "34f436ae888763914dd350b891ff6422dd5119216223b819bd595915dc3e74f9",
          cjk: false,
        },
        {
          id: "gitgraph/031",
          title: "Customizing Commit colors",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    commitLabelColor: '#ff0000'\n    commitLabelBackground: '#00ff00'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "05ddd198c9c03bcaa8121af06c7e3a1ebd11a5faae64c9d90d937d0b22b5a7ce",
          cjk: false,
        },
        {
          id: "gitgraph/032",
          title: "Customizing Commit Label Font Size",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    commitLabelColor: '#ff0000'\n    commitLabelBackground: '#00ff00'\n    commitLabelFontSize: '16px'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "32211c1ef5aae52117e8b281197ebc3987935117467b87173dff578a02f7e049",
          cjk: false,
        },
        {
          id: "gitgraph/033",
          title: "Customizing Tag Label Font Size",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    commitLabelColor: '#ff0000'\n    commitLabelBackground: '#00ff00'\n    tagLabelFontSize: '16px'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "79fc3314444f16a4cbf5b867f01d9926e3cba8cbf609b15051237b65d7120b35",
          cjk: false,
        },
        {
          id: "gitgraph/034",
          title: "Customizing Tag colors",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    tagLabelColor: '#ff0000'\n    tagLabelBackground: '#00ff00'\n    tagLabelBorder: '#0000ff'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "a54589c7032993065095ff88bc19c77cb12bc1de0ae00701f842d2aaa257caca",
          cjk: false,
        },
        {
          id: "gitgraph/035",
          title: "Customizing Highlight commit colors",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    'gitInv0': '#ff0000'\n---\n       gitGraph\n       commit\n       branch develop\n       commit tag:\"v1.0.0\"\n       commit\n       checkout main\n       commit type: HIGHLIGHT\n       commit\n       merge develop\n       commit\n       branch featureA\n       commit\n",
          sha256: "8e25ca4d90ecae9d6f35c6c28661bbf5b3382b6c151977f01c5d9c0883e04ac5",
          cjk: false,
        },
      ],
    },
    {
      type: "c4",
      name: "C4 Diagram",
      documentation: "https://mermaid.js.org/syntax/c4.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/c4.md",
      cases: [
        {
          id: "c4/001",
          title: "C4 Diagrams",
          source:
            '    C4Context\n      title System Context diagram for Internet Banking System\n      Enterprise_Boundary(b0, "BankBoundary0") {\n        Person(customerA, "Banking Customer A", "A customer of the bank, with personal bank accounts.")\n        Person(customerB, "Banking Customer B")\n        Person_Ext(customerC, "Banking Customer C", "desc")\n\n        Person(customerD, "Banking Customer D", "A customer of the bank, <br/> with personal bank accounts.")\n\n        System(SystemAA, "Internet Banking System", "Allows customers to view information about their bank accounts, and make payments.")\n\n        Enterprise_Boundary(b1, "BankBoundary") {\n\n          SystemDb_Ext(SystemE, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")\n\n          System_Boundary(b2, "BankBoundary2") {\n            System(SystemA, "Banking System A")\n            System(SystemB, "Banking System B", "A system of the bank, with personal bank accounts. next line.")\n          }\n\n          System_Ext(SystemC, "E-mail system", "The internal Microsoft Exchange e-mail system.")\n          SystemDb(SystemD, "Banking System D Database", "A system of the bank, with personal bank accounts.")\n\n          Boundary(b3, "BankBoundary3", "boundary") {\n            SystemQueue(SystemF, "Banking System F Queue", "A system of the bank.")\n            SystemQueue_Ext(SystemG, "Banking System G Queue", "A system of the bank, with personal bank accounts.")\n          }\n        }\n      }\n\n      BiRel(customerA, SystemAA, "Uses")\n      BiRel(SystemAA, SystemE, "Uses")\n      Rel(SystemAA, SystemC, "Sends e-mails", "SMTP")\n      Rel(SystemC, customerA, "Sends e-mails to")\n\n      UpdateElementStyle(customerA, $fontColor="red", $bgColor="grey", $borderColor="red")\n      UpdateRelStyle(customerA, SystemAA, $textColor="blue", $lineColor="blue", $offsetX="5")\n      UpdateRelStyle(SystemAA, SystemE, $textColor="blue", $lineColor="blue", $offsetY="-10")\n      UpdateRelStyle(SystemAA, SystemC, $textColor="blue", $lineColor="blue", $offsetY="-40", $offsetX="-50")\n      UpdateRelStyle(SystemC, customerA, $textColor="red", $lineColor="red", $offsetX="-50", $offsetY="20")\n\n      UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")\n',
          sha256: "3a8fd915f7952f8c35497019432468fbe74dde78d5a9e8ff3e37e8f99f6ac9c8",
          cjk: false,
        },
        {
          id: "c4/002",
          title: "C4 System Context Diagram (C4Context)",
          source:
            '    C4Context\n      title System Context diagram for Internet Banking System\n      Enterprise_Boundary(b0, "BankBoundary0") {\n        Person(customerA, "Banking Customer A", "A customer of the bank, with personal bank accounts.")\n        Person(customerB, "Banking Customer B")\n        Person_Ext(customerC, "Banking Customer C", "desc")\n\n        Person(customerD, "Banking Customer D", "A customer of the bank, <br/> with personal bank accounts.")\n\n        System(SystemAA, "Internet Banking System", "Allows customers to view information about their bank accounts, and make payments.")\n\n        Enterprise_Boundary(b1, "BankBoundary") {\n\n          SystemDb_Ext(SystemE, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")\n\n          System_Boundary(b2, "BankBoundary2") {\n            System(SystemA, "Banking System A")\n            System(SystemB, "Banking System B", "A system of the bank, with personal bank accounts. next line.")\n          }\n\n          System_Ext(SystemC, "E-mail system", "The internal Microsoft Exchange e-mail system.")\n          SystemDb(SystemD, "Banking System D Database", "A system of the bank, with personal bank accounts.")\n\n          Boundary(b3, "BankBoundary3", "boundary") {\n            SystemQueue(SystemF, "Banking System F Queue", "A system of the bank.")\n            SystemQueue_Ext(SystemG, "Banking System G Queue", "A system of the bank, with personal bank accounts.")\n          }\n        }\n      }\n\n      BiRel(customerA, SystemAA, "Uses")\n      BiRel(SystemAA, SystemE, "Uses")\n      Rel(SystemAA, SystemC, "Sends e-mails", "SMTP")\n      Rel(SystemC, customerA, "Sends e-mails to")\n\n      UpdateElementStyle(customerA, $fontColor="red", $bgColor="grey", $borderColor="red")\n      UpdateRelStyle(customerA, SystemAA, $textColor="blue", $lineColor="blue", $offsetX="5")\n      UpdateRelStyle(SystemAA, SystemE, $textColor="blue", $lineColor="blue", $offsetY="-10")\n      UpdateRelStyle(SystemAA, SystemC, $textColor="blue", $lineColor="blue", $offsetY="-40", $offsetX="-50")\n      UpdateRelStyle(SystemC, customerA, $textColor="red", $lineColor="red", $offsetX="-50", $offsetY="20")\n\n      UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")\n',
          sha256: "3a8fd915f7952f8c35497019432468fbe74dde78d5a9e8ff3e37e8f99f6ac9c8",
          cjk: false,
        },
        {
          id: "c4/003",
          title: "C4 Container diagram (C4Container)",
          source:
            '    C4Container\n    title Container diagram for Internet Banking System\n\n    System_Ext(email_system, "E-Mail System", "The internal Microsoft Exchange system", $tags="v1.0")\n    Person(customer, Customer, "A customer of the bank, with personal bank accounts", $tags="v1.0")\n\n    Container_Boundary(c1, "Internet Banking") {\n        Container(spa, "Single-Page App", "JavaScript, Angular", "Provides all the Internet banking functionality to customers via their web browser")\n        Container_Ext(mobile_app, "Mobile App", "C#, Xamarin", "Provides a limited subset of the Internet banking functionality to customers via their mobile device")\n        Container(web_app, "Web Application", "Java, Spring MVC", "Delivers the static content and the Internet banking SPA")\n        ContainerDb(database, "Database", "SQL Database", "Stores user registration information, hashed auth credentials, access logs, etc.")\n        ContainerDb_Ext(backend_api, "API Application", "Java, Docker Container", "Provides Internet banking functionality via API")\n\n    }\n\n    System_Ext(banking_system, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")\n\n    Rel(customer, web_app, "Uses", "HTTPS")\n    UpdateRelStyle(customer, web_app, $offsetY="60", $offsetX="90")\n    Rel(customer, spa, "Uses", "HTTPS")\n    UpdateRelStyle(customer, spa, $offsetY="-40")\n    Rel(customer, mobile_app, "Uses")\n    UpdateRelStyle(customer, mobile_app, $offsetY="-30")\n\n    Rel(web_app, spa, "Delivers")\n    UpdateRelStyle(web_app, spa, $offsetX="130")\n    Rel(spa, backend_api, "Uses", "async, JSON/HTTPS")\n    Rel(mobile_app, backend_api, "Uses", "async, JSON/HTTPS")\n    Rel_Back(database, backend_api, "Reads from and writes to", "sync, JDBC")\n\n    Rel(email_system, customer, "Sends e-mails to")\n    UpdateRelStyle(email_system, customer, $offsetX="-45")\n    Rel(backend_api, email_system, "Sends e-mails using", "sync, SMTP")\n    UpdateRelStyle(backend_api, email_system, $offsetY="-60")\n    Rel(backend_api, banking_system, "Uses", "sync/async, XML/HTTPS")\n    UpdateRelStyle(backend_api, banking_system, $offsetY="-50", $offsetX="-140")\n',
          sha256: "87baedf88b6688ce3789cfd1f9896c1d9a488a87f6ae640c3a39a0f924c0d3af",
          cjk: false,
        },
        {
          id: "c4/004",
          title: "C4 Component diagram (C4Component)",
          source:
            '    C4Component\n    title Component diagram for Internet Banking System - API Application\n\n    Container(spa, "Single Page Application", "javascript and angular", "Provides all the internet banking functionality to customers via their web browser.")\n    Container(ma, "Mobile App", "Xamarin", "Provides a limited subset to the internet banking functionality to customers via their mobile device.")\n    ContainerDb(db, "Database", "Relational Database Schema", "Stores user registration information, hashed authentication credentials, access logs, etc.")\n    System_Ext(mbs, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")\n\n    Container_Boundary(api, "API Application") {\n        Component(sign, "Sign In Controller", "MVC Rest Controller", "Allows users to sign in to the internet banking system")\n        Component(accounts, "Accounts Summary Controller", "MVC Rest Controller", "Provides customers with a summary of their bank accounts")\n        Component(security, "Security Component", "Spring Bean", "Provides functionality related to singing in, changing passwords, etc.")\n        Component(mbsfacade, "Mainframe Banking System Facade", "Spring Bean", "A facade onto the mainframe banking system.")\n\n        Rel(sign, security, "Uses")\n        Rel(accounts, mbsfacade, "Uses")\n        Rel(security, db, "Read & write to", "JDBC")\n        Rel(mbsfacade, mbs, "Uses", "XML/HTTPS")\n    }\n\n    Rel_Back(spa, sign, "Uses", "JSON/HTTPS")\n    Rel(spa, accounts, "Uses", "JSON/HTTPS")\n\n    Rel(ma, sign, "Uses", "JSON/HTTPS")\n    Rel(ma, accounts, "Uses", "JSON/HTTPS")\n\n    UpdateRelStyle(spa, sign, $offsetY="-40")\n    UpdateRelStyle(spa, accounts, $offsetX="40", $offsetY="40")\n\n    UpdateRelStyle(ma, sign, $offsetX="-90", $offsetY="40")\n    UpdateRelStyle(ma, accounts, $offsetY="-40")\n\n        UpdateRelStyle(sign, security, $offsetX="-160", $offsetY="10")\n        UpdateRelStyle(accounts, mbsfacade, $offsetX="140", $offsetY="10")\n        UpdateRelStyle(security, db, $offsetY="-40")\n        UpdateRelStyle(mbsfacade, mbs, $offsetY="-40")\n',
          sha256: "2c37fb813bb3cd99c0f711d0f8a92171df3158ccc9ad2d455b27fa7edf88f6e2",
          cjk: false,
        },
        {
          id: "c4/005",
          title: "C4 Dynamic diagram (C4Dynamic)",
          source:
            '    C4Dynamic\n    title Dynamic diagram for Internet Banking System - API Application\n\n    ContainerDb(c4, "Database", "Relational Database Schema", "Stores user registration information, hashed authentication credentials, access logs, etc.")\n    Container(c1, "Single-Page Application", "JavaScript and Angular", "Provides all of the Internet banking functionality to customers via their web browser.")\n    Container_Boundary(b, "API Application") {\n      Component(c3, "Security Component", "Spring Bean", "Provides functionality Related to signing in, changing passwords, etc.")\n      Component(c2, "Sign In Controller", "Spring MVC Rest Controller", "Allows users to sign in to the Internet Banking System.")\n    }\n    Rel(c1, c2, "Submits credentials to", "JSON/HTTPS")\n    Rel(c2, c3, "Calls isAuthenticated() on")\n    Rel(c3, c4, "select * from users where username = ?", "JDBC")\n\n    UpdateRelStyle(c1, c2, $textColor="red", $offsetY="-40")\n    UpdateRelStyle(c2, c3, $textColor="red", $offsetX="-40", $offsetY="60")\n    UpdateRelStyle(c3, c4, $textColor="red", $offsetY="-40", $offsetX="10")\n',
          sha256: "78a9531bbd743e92f73152dffaa28a9dd63c07dfa8da36f7e8c727800c53a284",
          cjk: false,
        },
        {
          id: "c4/006",
          title: "C4 Deployment diagram (C4Deployment)",
          source:
            '    C4Deployment\n    title Deployment Diagram for Internet Banking System - Live\n\n    Deployment_Node(mob, "Customer\'s mobile device", "Apple IOS or Android"){\n        Container(mobile, "Mobile App", "Xamarin", "Provides a limited subset of the Internet Banking functionality to customers via their mobile device.")\n    }\n\n    Deployment_Node(comp, "Customer\'s computer", "Microsoft Windows or Apple macOS"){\n        Deployment_Node(browser, "Web Browser", "Google Chrome, Mozilla Firefox,<br/> Apple Safari or Microsoft Edge"){\n            Container(spa, "Single Page Application", "JavaScript and Angular", "Provides all of the Internet Banking functionality to customers via their web browser.")\n        }\n    }\n\n    Deployment_Node(plc, "Big Bank plc", "Big Bank plc data center"){\n        Deployment_Node(dn, "bigbank-api*** x8", "Ubuntu 16.04 LTS"){\n            Deployment_Node(apache, "Apache Tomcat", "Apache Tomcat 8.x"){\n                Container(api, "API Application", "Java and Spring MVC", "Provides Internet Banking functionality via a JSON/HTTPS API.")\n            }\n        }\n        Deployment_Node(bb2, "bigbank-web*** x4", "Ubuntu 16.04 LTS"){\n            Deployment_Node(apache2, "Apache Tomcat", "Apache Tomcat 8.x"){\n                Container(web, "Web Application", "Java and Spring MVC", "Delivers the static content and the Internet Banking single page application.")\n            }\n        }\n        Deployment_Node(bigbankdb01, "bigbank-db01", "Ubuntu 16.04 LTS"){\n            Deployment_Node(oracle, "Oracle - Primary", "Oracle 12c"){\n                ContainerDb(db, "Database", "Relational Database Schema", "Stores user registration information, hashed authentication credentials, access logs, etc.")\n            }\n        }\n        Deployment_Node(bigbankdb02, "bigbank-db02", "Ubuntu 16.04 LTS") {\n            Deployment_Node(oracle2, "Oracle - Secondary", "Oracle 12c") {\n                ContainerDb(db2, "Database", "Relational Database Schema", "Stores user registration information, hashed authentication credentials, access logs, etc.")\n            }\n        }\n    }\n\n    Rel(mobile, api, "Makes API calls to", "json/HTTPS")\n    Rel(spa, api, "Makes API calls to", "json/HTTPS")\n    Rel_U(web, spa, "Delivers to the customer\'s web browser")\n    Rel(api, db, "Reads from and writes to", "JDBC")\n    Rel(api, db2, "Reads from and writes to", "JDBC")\n    Rel_R(db, db2, "Replicates data to")\n\n    UpdateRelStyle(spa, api, $offsetY="-40")\n    UpdateRelStyle(web, spa, $offsetY="-40")\n    UpdateRelStyle(api, db, $offsetY="-20", $offsetX="5")\n    UpdateRelStyle(api, db2, $offsetX="-40", $offsetY="-20")\n    UpdateRelStyle(db, db2, $offsetY="-10")\n',
          sha256: "303a34d8423cf50e4157fa6956ad711362058f5b6d897cb58d12ec5d1475c730",
          cjk: false,
        },
      ],
    },
    {
      type: "mindmap",
      name: "Mindmaps",
      documentation: "https://mermaid.js.org/syntax/mindmap.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/mindmap.md",
      cases: [
        {
          id: "mindmap/001",
          title: "An example of a mindmap.",
          source:
            "mindmap\n  root((mindmap))\n    Origins\n      Long history\n      ::icon(fa fa-book)\n      Popularisation\n        British popular psychology author Tony Buzan\n    Research\n      On effectiveness<br/>and features\n      On Automatic creation\n        Uses\n            Creative techniques\n            Strategic planning\n            Argument mapping\n    Tools\n      Pen and paper\n      Mermaid\n",
          sha256: "24178e25fa6d7b3efcc3b841a0a27d49ba5139d04dd6e50fe3f26ecf01aa6a36",
          cjk: false,
        },
        {
          id: "mindmap/002",
          title: "Syntax",
          source: "mindmap\nRoot\n    A\n      B\n      C\n",
          sha256: "50120b037f07451727a4c261d4a2f601f5ce26c40c061336c710b49d99f33bf7",
          cjk: false,
        },
        {
          id: "mindmap/003",
          title: "Square",
          source: "mindmap\n    id[I am a square]\n",
          sha256: "43863c877bb21c72b2a273b4532cd8761eded574bae3097a232c4af9377de246",
          cjk: false,
        },
        {
          id: "mindmap/004",
          title: "Rounded square",
          source: "mindmap\n    id(I am a rounded square)\n",
          sha256: "b34484235942c5c0d0e48005874d8f8dabe153b90e763ab46ab3ab04ff6909a5",
          cjk: false,
        },
        {
          id: "mindmap/005",
          title: "Circle",
          source: "mindmap\n    id((I am a circle))\n",
          sha256: "cc31217d41be20e68e0dab41fbd3934efb120dbc4e1b50e12776ce94f3258cb0",
          cjk: false,
        },
        {
          id: "mindmap/006",
          title: "Bang",
          source: "mindmap\n    id))I am a bang((\n",
          sha256: "19a347a297bd5484646ba3ad7dd26950b10b879482b80ff2681fb2d589752e0d",
          cjk: false,
        },
        {
          id: "mindmap/007",
          title: "Cloud",
          source: "mindmap\n    id)I am a cloud(\n",
          sha256: "25d14aaf879efe222b33d92e132d91969fab342ea1ed80177c8794beef774242",
          cjk: false,
        },
        {
          id: "mindmap/008",
          title: "Hexagon",
          source: "mindmap\n    id{{I am a hexagon}}\n",
          sha256: "53d07cd0b16d68dcbb942b4743f6896f468e2a70b6e8ad077c4d7145dda79155",
          cjk: false,
        },
        {
          id: "mindmap/009",
          title: "Default",
          source: "mindmap\n    I am the default shape\n",
          sha256: "85604c1294449e7d2eb033a6668f62626c6e5238f9ff79af5103b9e7912f4294",
          cjk: false,
        },
        {
          id: "mindmap/010",
          title: "Icons",
          source:
            "mindmap\n    Root\n        A\n        ::icon(fa fa-book)\n        B(B)\n        ::icon(mdi mdi-skull-outline)\n",
          sha256: "3a13884fa1743ddb4ae736ecaa7537a4287e1503c335bc2d8cbb54deb91bde75",
          cjk: false,
        },
        {
          id: "mindmap/011",
          title: "Classes",
          source:
            "mindmap\n    Root\n        A[A]\n        :::urgent large\n        B(B)\n        C\n",
          sha256: "7d02f0df9d19c3f32e5b6c02d33639a5755e649ae7abf5d4d23564a45e48df50",
          cjk: false,
        },
        {
          id: "mindmap/012",
          title: "Unclear indentation",
          source: "mindmap\nRoot\n    A\n        B\n      C\n",
          sha256: "5106c1aa1c30fe908c89b36f4ecd8ac85903352e35e2bf2df28c8b918186fcac",
          cjk: false,
        },
        {
          id: "mindmap/013",
          title: "Markdown Strings",
          source:
            'mindmap\n    id1["`**Root** with\na second line\nUnicode works too: 🤓`"]\n      id2["`The dog in **the** hog... a *very long text* that wraps to a new line`"]\n      id3[Regular labels still works]\n',
          sha256: "d34688197fc3593a7b62592bfac23991f50dcb4342d310979f24e94754941123",
          cjk: false,
        },
      ],
    },
    {
      type: "timeline",
      name: "Timeline",
      documentation: "https://mermaid.js.org/syntax/timeline.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/timeline.md",
      cases: [
        {
          id: "timeline/001",
          title: "An example of a timeline",
          source:
            "timeline\n    title History of Social Media Platform\n    2002 : LinkedIn\n    2004 : Facebook\n         : Google\n    2005 : YouTube\n    2006 : Twitter\n",
          sha256: "1b6ef8c6e2bb60382d1e417d7363b495a28cfba8b98c31705c30c32081801372",
          cjk: false,
        },
        {
          id: "timeline/002",
          title: "Syntax",
          source:
            "timeline\n    title History of Social Media Platform\n    2002 : LinkedIn\n    2004 : Facebook : Google\n    2005 : YouTube\n    2006 : Twitter\n",
          sha256: "632b53443b0ca6875a179f9cd142fdcf36cf964c6d89c396b3fd0ac4b78a7d13",
          cjk: false,
        },
        {
          id: "timeline/003",
          title: "Grouping of time periods in sections/ages",
          source:
            "timeline\n    title Timeline of Industrial Revolution\n    section 17th-20th century\n        Industry 1.0 : Machinery, Water power, Steam <br>power\n        Industry 2.0 : Electricity, Internal combustion engine, Mass production\n        Industry 3.0 : Electronics, Computers, Automation\n    section 21st century\n        Industry 4.0 : Internet, Robotics, Internet of Things\n        Industry 5.0 : Artificial intelligence, Big data, 3D printing\n",
          sha256: "523985f9a7ca3ab9d5477c18115fa8b8253f660a11c4bb49ccad873bb9fadb2b",
          cjk: false,
        },
        {
          id: "timeline/004",
          title: "Wrapping of text for long time-periods or events",
          source:
            "timeline\n        title England's History Timeline\n        section Stone Age\n          7600 BC : Britain's oldest known house was built in Orkney, Scotland\n          6000 BC : Sea levels rise and Britain becomes an island.<br> The people who live here are hunter-gatherers.\n        section Bronze Age\n          2300 BC : People arrive from Europe and settle in Britain. <br>They bring farming and metalworking.\n                  : New styles of pottery and ways of burying the dead appear.\n          2200 BC : The last major building works are completed at Stonehenge.<br> People now bury their dead in stone circles.\n                  : The first metal objects are made in Britain.Some other nice things happen. it is a good time to be alive.\n",
          sha256: "c2440af8294c701536f8bd1333830af0df17c8e22e596fdd05d3f2dc59e9eafd",
          cjk: false,
        },
        {
          id: "timeline/005",
          title: "Wrapping of text for long time-periods or events",
          source:
            "timeline\n        title MermaidChart 2023 Timeline\n        section 2023 Q1 <br> Release Personal Tier\n          Bullet 1 : sub-point 1a : sub-point 1b\n               : sub-point 1c\n          Bullet 2 : sub-point 2a : sub-point 2b\n        section 2023 Q2 <br> Release XYZ Tier\n          Bullet 3 : sub-point <br> 3a : sub-point 3b\n               : sub-point 3c\n          Bullet 4 : sub-point 4a : sub-point 4b\n",
          sha256: "e2806e53df11c52185069ab59c263cffd50aa2beb555f6375a6895b5f39478af",
          cjk: false,
        },
        {
          id: "timeline/006",
          title: "Direction (v11.14.0+)",
          source:
            "timeline TD\n  title MermaidChart 2023 Timeline\n    section 2023 Q1 <br> Release Personal Tier\n      Bullet 1 : sub-point 1a : sub-point 1b\n      Bullet 2 : sub-point 2a : sub-point 2b\n    section 2023 Q2 <br> Release XYZ Tier\n      Bullet 3 : sub-point <br> 3a : sub-point 3b\n      Bullet 4 : sub-point 4a : sub-point 4b\n",
          sha256: "fc46654076ba27e43f034c7450a4f07e228e8b3517d1999958eb7807fb118f31",
          cjk: false,
        },
        {
          id: "timeline/007",
          title: "Styling of time periods and events",
          source:
            "    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n",
          sha256: "4a436bf5cde4cf7064475b34a017b531324895a66e11c18eb75378fff0054422",
          cjk: false,
        },
        {
          id: "timeline/008",
          title: "Styling of time periods and events",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n  timeline:\n    disableMulticolor: true\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n",
          sha256: "56b167410e41154b2ae488a3be27acc3a077c8a8f8b744175a401fb5e48a1228",
          cjk: false,
        },
        {
          id: "timeline/009",
          title: "Customizing Color scheme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n  themeVariables:\n    cScale0: '#ff0000'\n    cScaleLabel0: '#ffffff'\n    cScale1: '#00ff00'\n    cScale2: '#0000ff'\n    cScaleLabel2: '#ffffff'\n---\n       timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "6ee60b83a541e26447bb91e4d6c83d1a6f6ef882067ccbdb3eed16a65e368b08",
          cjk: false,
        },
        {
          id: "timeline/010",
          title: "Base Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'base'\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "d355ed477cfd4b671660099d7b5f2aabed4f2f37dfb9b58b085dc8a96c5fc657",
          cjk: false,
        },
        {
          id: "timeline/011",
          title: "Forest Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'forest'\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "a24bead1895db6a5952242866563a286fdd35a2ba18f27356d81166929269d9f",
          cjk: false,
        },
        {
          id: "timeline/012",
          title: "Dark Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'dark'\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "f09678e83888b535e359e428ad53f8eabe9dc749bf6b7858398371983f79bb2f",
          cjk: false,
        },
        {
          id: "timeline/013",
          title: "The `default` Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'default'\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "87eacd36f6ef7b35936d9d94ad985824a3bc3f42fb2aedabe170ede481a922fc",
          cjk: false,
        },
        {
          id: "timeline/014",
          title: "Neutral Theme",
          source:
            "---\nconfig:\n  logLevel: 'debug'\n  theme: 'neutral'\n---\n    timeline\n        title History of Social Media Platform\n          2002 : LinkedIn\n          2004 : Facebook : Google\n          2005 : YouTube\n          2006 : Twitter\n          2007 : Tumblr\n          2008 : Instagram\n          2010 : Pinterest\n",
          sha256: "399391685b5266aa85385e61b0a4057003b40dba1db4dfe7e1f774b16b039bbc",
          cjk: false,
        },
      ],
    },
    {
      type: "zenuml",
      name: "ZenUML",
      documentation: "https://mermaid.js.org/syntax/zenuml.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/zenuml.md",
      cases: [
        {
          id: "zenuml/001",
          title: "ZenUML",
          source:
            "zenuml\n    title Demo\n    Alice->John: Hello John, how are you?\n    John->Alice: Great!\n    Alice->John: See you later!\n",
          sha256: "7ce5c39b6c91ba039079e2464738dd34475749022216daa73bf0861091f21e8d",
          cjk: false,
        },
        {
          id: "zenuml/002",
          title: "Participants",
          source:
            "zenuml\n    title Declare participant (optional)\n    Bob\n    Alice\n    Alice->Bob: Hi Bob\n    Bob->Alice: Hi Alice\n",
          sha256: "7af386e80957e45e495cb6f38f62898dd46e6e7ccef4f61823400d9b029a9c3d",
          cjk: false,
        },
        {
          id: "zenuml/003",
          title: "Annotators",
          source:
            "zenuml\n    title Annotators\n    @Actor Alice\n    @Database Bob\n    Alice->Bob: Hi Bob\n    Bob->Alice: Hi Alice\n",
          sha256: "3def1a97699831394c37c1338c8120eacb422b65f879ac5e36af7026fa33569d",
          cjk: false,
        },
        {
          id: "zenuml/004",
          title: "Aliases",
          source:
            "zenuml\n    title Aliases\n    A as Alice\n    J as John\n    A->J: Hello John, how are you?\n    J->A: Great!\n",
          sha256: "5b94bc24f6cb4921eb56fee79e2dd8e06ea74f2ab1ad47b9d7552a8863fa8b99",
          cjk: false,
        },
        {
          id: "zenuml/005",
          title: "Sync message",
          source:
            "zenuml\n    title Sync message\n    A.SyncMessage\n    A.SyncMessage(with, parameters) {\n      B.nestedSyncMessage()\n    }\n",
          sha256: "21355aaa4215f7648a534e34c7e02b1304118ee206150351367ded1142f788ee",
          cjk: false,
        },
        {
          id: "zenuml/006",
          title: "Async message",
          source: "zenuml\n    title Async message\n    Alice->Bob: How are you?\n",
          sha256: "3019c09fb59a781ee4d097892ab970f83daf48976023f0b78281686eadb80294",
          cjk: false,
        },
        {
          id: "zenuml/007",
          title: "Creation message",
          source: "zenuml\n    new A1\n    new A2(with, parameters)\n",
          sha256: "dac67717be23eed18f620b8c167a596d0719ba0520a76f06a798572707345bbe",
          cjk: false,
        },
        {
          id: "zenuml/008",
          title: "Reply message",
          source:
            "zenuml\n    // 1. assign a variable from a sync message.\n    a = A.SyncMessage()\n\n    // 1.1. optionally give the variable a type\n    SomeType a = A.SyncMessage()\n\n    // 2. use return keyword\n    A.SyncMessage() {\n    return result\n    }\n\n    // 3. use @return or @reply annotator on an async message\n    @return\n    A->B: result\n",
          sha256: "61f4bc1d82a3c094d03a5e3a2d3a7f7e65d08e64558f600ec623ba802e69a505",
          cjk: false,
        },
        {
          id: "zenuml/009",
          title: "Reply message",
          source:
            "zenuml\n    title Reply message\n    Client->A.method() {\n      B.method() {\n        if(condition) {\n          return x1\n          // return early\n          @return\n          A->Client: x11\n        }\n      }\n      return x2\n    }\n",
          sha256: "0807c6f7a9b20f69282b16a40787829a7205dc85a4f4be440f6182465fb1ab36",
          cjk: false,
        },
        {
          id: "zenuml/010",
          title: "Nesting",
          source:
            "zenuml\n    A.method() {\n      B.nested_sync_method()\n      B->C: nested async message\n    }\n",
          sha256: "e0292875899417280ad6c9460020263c1a9c23ae9540496355166b7cd0c77fda",
          cjk: false,
        },
        {
          id: "zenuml/011",
          title: "Comments",
          source:
            "zenuml\n    // a comment on a participant will not be rendered\n    BookService\n    // a comment on a message.\n    // **Markdown** is supported.\n    BookService.getBook()\n",
          sha256: "42e03255a8014dd486a96c4d40c709a0cbe9ae41d3d822bf7cfa53802a7af02a",
          cjk: false,
        },
        {
          id: "zenuml/012",
          title: "Loops",
          source:
            "zenuml\n    Alice->John: Hello John, how are you?\n    while(true) {\n      John->Alice: Great!\n    }\n",
          sha256: "85d3dac12de1ee16cf7c8323bc46eae7eabd716df418eac8a0ccb2452fdf961c",
          cjk: false,
        },
        {
          id: "zenuml/013",
          title: "Alt",
          source:
            "zenuml\n    Alice->Bob: Hello Bob, how are you?\n    if(is_sick) {\n      Bob->Alice: Not so good :(\n    } else {\n      Bob->Alice: Feeling fresh like a daisy\n    }\n",
          sha256: "84c5a290408790184c89992049882d735190df893fa4266aad2f027a90b4e6f6",
          cjk: false,
        },
        {
          id: "zenuml/014",
          title: "Opt",
          source:
            "zenuml\n    Alice->Bob: Hello Bob, how are you?\n    Bob->Alice: Not so good :(\n    opt {\n      Bob->Alice: Thanks for asking\n    }\n",
          sha256: "976da0c74d547c5301cc79d2e1f3a8ca784bd70d4cb7ed4eb5f9556ac5d4fefd",
          cjk: false,
        },
        {
          id: "zenuml/015",
          title: "Parallel",
          source:
            "zenuml\n    par {\n        Alice->Bob: Hello guys!\n        Alice->John: Hello guys!\n    }\n",
          sha256: "1ff7c6b0c55b129c886286f092d1e1c4c84ab855a763082d90dac75fcb03967f",
          cjk: false,
        },
        {
          id: "zenuml/016",
          title: "Try/Catch/Finally (Break)",
          source:
            "zenuml\n    try {\n      Consumer->API: Book something\n      API->BookingService: Start booking process\n    } catch {\n      API->Consumer: show failure\n    } finally {\n      API->BookingService: rollback status\n    }\n",
          sha256: "6a12b47cbe7adaf249eb03c425090dcc16d3a051d53c111b0abe4c0798babf5c",
          cjk: false,
        },
      ],
    },
    {
      type: "sankey",
      name: "Sankey",
      documentation: "https://mermaid.js.org/syntax/sankey.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/sankey.md",
      cases: [
        {
          id: "sankey/001",
          title: "Example",
          source:
            "---\nconfig:\n  sankey:\n    showValues: false\n---\nsankey\n\nAgricultural 'waste',Bio-conversion,124.729\nBio-conversion,Liquid,0.597\nBio-conversion,Losses,26.862\nBio-conversion,Solid,280.322\nBio-conversion,Gas,81.144\nBiofuel imports,Liquid,35\nBiomass imports,Solid,35\nCoal imports,Coal,11.606\nCoal reserves,Coal,63.965\nCoal,Solid,75.571\nDistrict heating,Industry,10.639\nDistrict heating,Heating and cooling - commercial,22.505\nDistrict heating,Heating and cooling - homes,46.184\nElectricity grid,Over generation / exports,104.453\nElectricity grid,Heating and cooling - homes,113.726\nElectricity grid,H2 conversion,27.14\nElectricity grid,Industry,342.165\nElectricity grid,Road transport,37.797\nElectricity grid,Agriculture,4.412\nElectricity grid,Heating and cooling - commercial,40.858\nElectricity grid,Losses,56.691\nElectricity grid,Rail transport,7.863\nElectricity grid,Lighting & appliances - commercial,90.008\nElectricity grid,Lighting & appliances - homes,93.494\nGas imports,Ngas,40.719\nGas reserves,Ngas,82.233\nGas,Heating and cooling - commercial,0.129\nGas,Losses,1.401\nGas,Thermal generation,151.891\nGas,Agriculture,2.096\nGas,Industry,48.58\nGeothermal,Electricity grid,7.013\nH2 conversion,H2,20.897\nH2 conversion,Losses,6.242\nH2,Road transport,20.897\nHydro,Electricity grid,6.995\nLiquid,Industry,121.066\nLiquid,International shipping,128.69\nLiquid,Road transport,135.835\nLiquid,Domestic aviation,14.458\nLiquid,International aviation,206.267\nLiquid,Agriculture,3.64\nLiquid,National navigation,33.218\nLiquid,Rail transport,4.413\nMarine algae,Bio-conversion,4.375\nNgas,Gas,122.952\nNuclear,Thermal generation,839.978\nOil imports,Oil,504.287\nOil reserves,Oil,107.703\nOil,Liquid,611.99\nOther waste,Solid,56.587\nOther waste,Bio-conversion,77.81\nPumped heat,Heating and cooling - homes,193.026\nPumped heat,Heating and cooling - commercial,70.672\nSolar PV,Electricity grid,59.901\nSolar Thermal,Heating and cooling - homes,19.263\nSolar,Solar Thermal,19.263\nSolar,Solar PV,59.901\nSolid,Agriculture,0.882\nSolid,Thermal generation,400.12\nSolid,Industry,46.477\nThermal generation,Electricity grid,525.531\nThermal generation,Losses,787.129\nThermal generation,District heating,79.329\nTidal,Electricity grid,9.452\nUK land based bioenergy,Bio-conversion,182.01\nWave,Electricity grid,19.013\nWind,Electricity grid,289.366\n",
          sha256: "c6739c6a83029fbe481d653c74d1e302c8226bc89edcbebec88062125baa78d3",
          cjk: false,
        },
        {
          id: "sankey/002",
          title: "Basic",
          source:
            "sankey\n\n%% source,target,value\nElectricity grid,Over generation / exports,104.453\nElectricity grid,Heating and cooling - homes,113.726\nElectricity grid,H2 conversion,27.14\n",
          sha256: "9c049429c8fe41b167a6425ed901596cede800f4a46a3f9eb53b0bdd3373265a",
          cjk: false,
        },
        {
          id: "sankey/003",
          title: "Empty Lines",
          source:
            "sankey\n\nBio-conversion,Losses,26.862\n\nBio-conversion,Solid,280.322\n\nBio-conversion,Gas,81.144\n",
          sha256: "2134589c75e25712a7e6faf0812b00a8f047f6b43933ee46e02555e1b72bc0be",
          cjk: false,
        },
        {
          id: "sankey/004",
          title: "Commas",
          source:
            'sankey\n\nPumped heat,"Heating and cooling, homes",193.026\nPumped heat,"Heating and cooling, commercial",70.672\n',
          sha256: "9cc115a6cef2e767bab4ecda336093cb0eea481f37c3f1d612a73fa8561484ad",
          cjk: false,
        },
        {
          id: "sankey/005",
          title: "Double Quotes",
          source:
            'sankey\n\nPumped heat,"Heating and cooling, ""homes""",193.026\nPumped heat,"Heating and cooling, ""commercial""",70.672\n',
          sha256: "0b3aede151cc98dc125c3b36777e22887bd5371140bd40779aa5368d1833724e",
          cjk: false,
        },
        {
          id: "sankey/006",
          title: "Label Style (v11.15.0+)",
          source:
            "---\nconfig:\n  sankey:\n    showValues: false\n    labelStyle: outlined\n---\nsankey\n\nElectricity grid,Heating and cooling - homes,113.726\nElectricity grid,Industry,342.165\nElectricity grid,Losses,56.691\n",
          sha256: "57a2dc77e55611cf79c0f7105ef4856d4198dbe5dceed7ed7fd9607f1fae36f4",
          cjk: false,
        },
        {
          id: "sankey/007",
          title: "Node Width and Padding (v11.15.0+)",
          source:
            "---\nconfig:\n  sankey:\n    showValues: false\n    nodeWidth: 15\n    nodePadding: 20\n---\nsankey\n\nElectricity grid,Heating and cooling - homes,113.726\nElectricity grid,Industry,342.165\nElectricity grid,Losses,56.691\n",
          sha256: "b2407cbd8da61671bd67cb8b0869365740669673d52605e9ba2444ec6a7595c8",
          cjk: false,
        },
        {
          id: "sankey/008",
          title: "Custom Node Colors (v11.15.0+)",
          source:
            '---\nconfig:\n  sankey:\n    showValues: false\n    nodeColors:\n      Electricity grid: "#4e79a7"\n      Industry: "#e15759"\n      Losses: "#bab0ab"\n---\nsankey\n\nElectricity grid,Heating and cooling - homes,113.726\nElectricity grid,Industry,342.165\nElectricity grid,Losses,56.691\n',
          sha256: "1bafcf479a9a4573b4b58a665d5eb65f716e52ee529309400ba85ce782277e5f",
          cjk: false,
        },
      ],
    },
    {
      type: "xyChart",
      name: "XY Chart",
      documentation: "https://mermaid.js.org/syntax/xyChart.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/xyChart.md",
      cases: [
        {
          id: "xyChart/001",
          title: "Example",
          source:
            'xychart\n    title "Sales Revenue"\n    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]\n    y-axis "Revenue (in $)" 4000 --> 11000\n    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]\n    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]\n',
          sha256: "26b0cd5e3c3bcf2c2d0cbbc02df82376d779b0ec1893940495460009622029fe",
          cjk: false,
        },
        {
          id: "xyChart/002",
          title: "Legend (v11.17.0+)",
          source:
            'xychart-beta\n  title "An Example Chart"\n  x-axis ["90d", "60d", "30d", "7d", "1d", "Current"]\n  y-axis "Seconds" 0 --> 198.2\n  line "avg" [48.1, 41.5, 45.7, 72.8, 67.7, 59.9]\n  line "p50" [38.2, 36.8, 39.7, 54.5, 49.0, 38.4]\n  line "p95" [112.2, 75.3, 103.0, 177.0, 180.2, 109.4]\n',
          sha256: "3685342d92ac94912769525db31a8c2dc9b7519b118c6f0e7bf3564314fbd0d4",
          cjk: false,
        },
        {
          id: "xyChart/003",
          title: "Setting Colors for Lines and Bars",
          source:
            '---\nconfig:\n  themeVariables:\n    xyChart:\n      plotColorPalette: \'#000000, #0000FF, #00FF00, #FF0000\'\n---\nxychart\ntitle "Different Colors in xyChart"\nx-axis "categoriesX" ["Category 1", "Category 2", "Category 3", "Category 4"]\ny-axis "valuesY" 0 --> 50\n%% Black line\nline [10,20,30,40]\n%% Blue bar\nbar [20,30,25,35]\n%% Green bar\nbar [15,25,20,30]\n%% Red line\nline [5,15,25,35]\n',
          sha256: "fbe6837b9d1a9a5dfe236abba0807caf5cb10dc5903af438e9717bf7da5688d2",
          cjk: false,
        },
        {
          id: "xyChart/004",
          title: "Displaying individual values on a bar chart (v11.14.0+)",
          source:
            '---\nconfig:\n    xyChart:\n        showDataLabel: true\n---\nxychart\n    title "Genres in top 100 book survey of 2025"\n    x-axis [comedy, romance, mystery, crime, "non fiction", other]\n    y-axis "Number of Books" 0 --> 30\n    bar [12,2,20,25,17,24]\n',
          sha256: "ade44d5c559d10e3c56d74fc864fe1361e1a8c7705a607a11a9e9b541b33dceb",
          cjk: false,
        },
        {
          id: "xyChart/005",
          title: "Displaying individual values on a bar chart (v11.14.0+)",
          source:
            '---\nconfig:\n    xyChart:\n        showDataLabel: true\n        showDataLabelOutsideBar: true\n---\nxychart\n    title "Genres in top 100 book survey of 2025"\n    x-axis [comedy, romance, mystery, crime, "non fiction", other]\n    y-axis "Number of Books" 0 --> 30\n    bar [12,2,20,25,17,24]\n',
          sha256: "55d282bc9b85f6b3291748e9d93f8926ac4f7fda958b9292742e0da38485002b",
          cjk: false,
        },
        {
          id: "xyChart/006",
          title: "Per-point text labels for line charts (v11.16.0+)",
          source:
            'xychart\n    title "Smallest AI models scoring above 60% on MMLU"\n    x-axis "Date" ["Apr 2022", "Feb 2023", "Jul 2023", "Sep 2023", "Apr 2024"]\n    y-axis "Parameters (B)" 0 --> 600\n    line [540 "PaLM", 65 "LLaMA-65B", 34 "Llama 2 34B", 7 "Mistral 7B", 3.8 "Phi-3-mini"]\n',
          sha256: "58d05b223eab0fcce4cc74ac8fd9bbc1ce7d2e192ca841868928836ce43edcd4",
          cjk: false,
        },
        {
          id: "xyChart/007",
          title: "Per-point text labels for line charts (v11.16.0+)",
          source:
            'xychart\n    title "Quarterly Performance"\n    x-axis [Q1, Q2, Q3, Q4]\n    y-axis "Revenue ($M)" 0 --> 100\n    line [25 "Launch", 45, 72, 90 "Target Hit"]\n',
          sha256: "ff4787edb814b8dee829c8ff5ea6ad5730ec785542f990dd197a3b58851c8f7e",
          cjk: false,
        },
        {
          id: "xyChart/008",
          title: "Example on config and theme",
          source:
            '---\nconfig:\n    xyChart:\n        width: 900\n        height: 600\n        showDataLabel: true\n    themeVariables:\n        xyChart:\n            titleColor: "#ff0000"\n---\nxychart\n    title "Sales Revenue"\n    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]\n    y-axis "Revenue (in $)" 4000 --> 11000\n    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]\n    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]\n',
          sha256: "4191b7b5dc6ecbe6b73464417555919ff9b13c4c17be733fe9032b25f572fd6b",
          cjk: false,
        },
      ],
    },
    {
      type: "block",
      name: "Block Diagram",
      documentation: "https://mermaid.js.org/syntax/block.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/block.md",
      cases: [
        {
          id: "block/001",
          title: "Introduction to Block Diagrams",
          source:
            'block\ncolumns 1\n  db(("DB"))\n  blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(down)\n  block:ID\n    A\n    B["A wide one in the middle"]\n    C\n  end\n  space\n  D\n  ID --> D\n  C --> D\n  style B fill:#969,stroke:#333,stroke-width:4px\n',
          sha256: "78e30a8aaf7fb9a0a374414e1984d2882815549cfce0428d71601302ed4998d2",
          cjk: false,
        },
        {
          id: "block/002",
          title: "Basic Structure",
          source: "block\n  a b c\n",
          sha256: "24e2536fc7a02abbc39c94baca52fcb055a4dd6c79fdd1e9733fba9faa2d823e",
          cjk: false,
        },
        {
          id: "block/003",
          title: "Column Usage",
          source: "block\n  columns 3\n  a b c d\n",
          sha256: "50dc2ed1ddf81876b7893c9bd57f920d4792a05470bf5f1ec6f1918f8ad34112",
          cjk: false,
        },
        {
          id: "block/004",
          title: "Spanning Multiple Columns",
          source: 'block\n  columns 3\n  a["A label"] b:2 c:2 d\n',
          sha256: "6fbaef0c0b994cc3bc8d26d54d52647b5b3fdb184e5fc8ddbd75f846e8a8766c",
          cjk: false,
        },
        {
          id: "block/005",
          title: "Nested Blocks",
          source: 'block\n    block\n      D\n    end\n    A["A: I am a wide one"]\n',
          sha256: "bd54fe8aea77a0c8cac4f1c6390ea744f26b3e7eab1142d5c8cb238ead92a7d4",
          cjk: false,
        },
        {
          id: "block/006",
          title: "Adjusting Widths",
          source:
            "block\n  columns 3\n  a:3\n  block:group1:2\n    columns 2\n    h i j k\n  end\n  g\n  block:group2:3\n    %% columns auto (default)\n    l m n o p q r\n  end\n",
          sha256: "7ddc40305625dcd51e15b5419a1ca1bc073d91b8c201b6ea65b00e9016b324dd",
          cjk: false,
        },
        {
          id: "block/007",
          title: "Adjusting Widths",
          source: 'block\n  block\n    columns 1\n    a["A label"] b c d\n  end\n',
          sha256: "8c1f8d5387a4888cee478e46f20f8f004f886e49efaab1b25cad980056e0aa0a",
          cjk: false,
        },
        {
          id: "block/008",
          title: "Example - Round Edged Block",
          source: 'block\n    id1("This is the text in the box")\n',
          sha256: "2a2aedc0e1a70079bc246e8d2b88d2888655ebdcac2ccc86c5a8e0110e55253a",
          cjk: false,
        },
        {
          id: "block/009",
          title: "Example - Stadium-Shaped Block",
          source: 'block\n    id1(["This is the text in the box"])\n',
          sha256: "a5a467c814bf0c9494becff51415866e6694ebe8b417a596f30a14d2c80b4f76",
          cjk: false,
        },
        {
          id: "block/010",
          title: "Example - Subroutine Shape",
          source: 'block\n    id1[["This is the text in the box"]]\n',
          sha256: "3eeec690367a6d711f1da9a10359cd7f3e9bebfd9400be3179c4fc8f4d66de09",
          cjk: false,
        },
        {
          id: "block/011",
          title: "Example - Cylindrical Shape",
          source: 'block\n    id1[("Database")]\n',
          sha256: "fd481f6b76858a8b13617c8ca2b7aa369fcadab2f1c23ee1811676ccaa8a5284",
          cjk: false,
        },
        {
          id: "block/012",
          title: "Example - Circle Shape",
          source: 'block\n    id1(("This is the text in the circle"))\n',
          sha256: "1493c7342a308ca295fd6bdc0d45d5d2aa97abb8c47275108f7d4e3cac97fafa",
          cjk: false,
        },
        {
          id: "block/013",
          title: "Example - Asymmetric, Rhombus, and Hexagon Shapes",
          source: 'block\n  id1>"This is the text in the box"]\n',
          sha256: "7134441c41f218d3085fa6869391398187b220962c0065c084bd6afc2aedfbf3",
          cjk: false,
        },
        {
          id: "block/014",
          title: "Example - Asymmetric, Rhombus, and Hexagon Shapes",
          source: 'block\n    id1{"This is the text in the box"}\n',
          sha256: "66fde5799aa4c0f763c6d0ba5d4c59c4a78d4ffb479a9480722c231ab6a8ab6f",
          cjk: false,
        },
        {
          id: "block/015",
          title: "Example - Asymmetric, Rhombus, and Hexagon Shapes",
          source: 'block\n    id1{{"This is the text in the box"}}\n',
          sha256: "6dd28f68976ab76a5fb99a40374e1ad0a6bed2f455e314f5e17e8ea6ab7b87d3",
          cjk: false,
        },
        {
          id: "block/016",
          title: "Example - Parallelogram and Trapezoid Shapes",
          source:
            'block\n  id1[/"This is the text in the box"/]\n  id2[\\"This is the text in the box"\\]\n  A[/"Christmas"\\]\n  B[\\"Go shopping"/]\n',
          sha256: "0c75f48188937507e2e81141eb236b5f93614b8589b01243c0cc9886735d9c02",
          cjk: false,
        },
        {
          id: "block/017",
          title: "Example - Double Circle",
          source: 'block\n    id1((("This is the text in the circle")))\n',
          sha256: "1d2ef9d1ea44d3522a7418a71527d39cc93363f161cddb44fa8f9022fbd4204a",
          cjk: false,
        },
        {
          id: "block/018",
          title: "Example - Block Arrows",
          source:
            'block\n  blockArrowId<["Label"]>(right)\n  blockArrowId2<["Label"]>(left)\n  blockArrowId3<["Label"]>(up)\n  blockArrowId4<["Label"]>(down)\n  blockArrowId5<["Label"]>(x)\n  blockArrowId6<["Label"]>(y)\n  blockArrowId7<["Label"]>(x, down)\n',
          sha256: "c574652df330f12f5c44143737737d2308b03c563e3359dbaaec41131ecb9059",
          cjk: false,
        },
        {
          id: "block/019",
          title: "Example - Space Blocks",
          source: "block\n  columns 3\n  a space b\n  c   d   e\n",
          sha256: "ab04e71554b0a34c34089733e264346ba6c626c639dd4b208c15a12a1bcf47c1",
          cjk: false,
        },
        {
          id: "block/020",
          title: "Example - Space Blocks",
          source: "block\n  ida space:3 idb idc\n",
          sha256: "7c6756e88c82bb955d6e42248ca25dfc29f8601746602f367fd4478e8fc6afd0",
          cjk: false,
        },
        {
          id: "block/021",
          title: "Basic Linking and Arrow Types",
          source: "block\n  A space B\n  A-->B\n",
          sha256: "f84186409cf32f763577dc6df754dd5ff83e66c4082333724d19203aa6f5f9af",
          cjk: false,
        },
        {
          id: "block/022",
          title: "Text on Links",
          source: 'block\n  A space:2 B\n  A-- "X" -->B\n',
          sha256: "e29ee1ca59125b3c2c9e819f3511554448f8cf5a57304e7fd3317f01405179c8",
          cjk: false,
        },
        {
          id: "block/023",
          title: "Text on Links",
          source:
            'block\ncolumns 1\n  db(("DB"))\n  blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(down)\n  block:ID\n    A\n    B["A wide one in the middle"]\n    C\n  end\n  space\n  D\n  ID --> D\n  C --> D\n  style B fill:#939,stroke:#333,stroke-width:4px\n',
          sha256: "0eeed10abc3140def4fd7496fed3cbf95e1c79dbe41456455b20a2cd94b1099f",
          cjk: false,
        },
        {
          id: "block/024",
          title: "Example - Styling a Single Block",
          source:
            'block\n  id1 space id2\n  id1("Start")-->id2("Stop")\n  style id1 fill:#636,stroke:#333,stroke-width:4px\n  style id2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5\n',
          sha256: "b6eebb8cba7e7a586b8454edf35aa45aeb4e526c3fa1a7c7077df60990f511bd",
          cjk: false,
        },
        {
          id: "block/025",
          title: "Example - Styling a Single Class",
          source:
            "block\n  A space B\n  A-->B\n  classDef blue fill:#6e6ce6,stroke:#333,stroke-width:4px;\n  class A blue\n  style B fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5\n",
          sha256: "f3c3e654997c3a542fd67da9e38f3e41d67c9931647f139665c739e4e789bad9",
          cjk: false,
        },
        {
          id: "block/026",
          title: "Example - System Architecture",
          source:
            'block\n  columns 3\n  Frontend blockArrowId6<[" "]>(right) Backend\n  space:2 down<[" "]>(down)\n  Disk left<[" "]>(left) Database[("Database")]\n\n  classDef front fill:#696,stroke:#333;\n  classDef back fill:#969,stroke:#333;\n  class Frontend front\n  class Backend,Database back\n',
          sha256: "c1690d0b0e175012900f71bd698d12f77c55a219b80856fa5852ec0fd909c7a9",
          cjk: false,
        },
        {
          id: "block/027",
          title: "Example - Business Process Flow",
          source:
            'block\n  columns 3\n  Start(("Start")) space:2\n  down<[" "]>(down) space:2\n  Decision{{"Make Decision"}} right<["Yes"]>(right) Process1["Process A"]\n  downAgain<["No"]>(down) space r3<["Done"]>(down)\n  Process2["Process B"] r2<["Done"]>(right) End(("End"))\n\n  style Start fill:#969;\n  style End fill:#696;\n',
          sha256: "668adabdd9df94a6af6123269da67044846272e127ec5bea1761abbf7cb40f34",
          cjk: false,
        },
        {
          id: "block/028",
          title: "Example - Incorrect Linking",
          source: "block\n  A space B\n  A --> B\n",
          sha256: "fddacaac62f065cc7859657ad249c244fef108deecf83c2f32c668afa42d5116",
          cjk: false,
        },
        {
          id: "block/029",
          title: "Example - Misplaced Styling",
          source: "  block\n    A\n    style A fill#969;\n",
          sha256: "6a5c5e673d9bdb2e5baef29b3ec41459e1e9cc2ca998715b43e252643f6a1b61",
          cjk: false,
        },
        {
          id: "block/030",
          title: "Example - Misplaced Styling",
          source: "block\n  A\n  style A fill:#969,stroke:#333;\n",
          sha256: "9636dee43e31f64c521248cc1e28d5dd93061747eae585a1aa68c5a117a09f4d",
          cjk: false,
        },
      ],
    },
    {
      type: "packet",
      name: "Packet",
      documentation: "https://mermaid.js.org/syntax/packet.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/packet.md",
      cases: [
        {
          id: "packet/001",
          title: "Examples",
          source:
            '---\ntitle: "TCP Packet"\n---\npacket\n0-15: "Source Port"\n16-31: "Destination Port"\n32-63: "Sequence Number"\n64-95: "Acknowledgment Number"\n96-99: "Data Offset"\n100-105: "Reserved"\n106: "URG"\n107: "ACK"\n108: "PSH"\n109: "RST"\n110: "SYN"\n111: "FIN"\n112-127: "Window"\n128-143: "Checksum"\n144-159: "Urgent Pointer"\n160-191: "(Options and Padding)"\n192-255: "Data (variable length)"\n',
          sha256: "48358a7c12b012d991051f4eb2143b72941245d1959ef90cba4f6b6aa2df5d41",
          cjk: false,
        },
        {
          id: "packet/002",
          title: "Examples",
          source:
            'packet\ntitle UDP Packet\n+16: "Source Port"\n+16: "Destination Port"\n32-47: "Length"\n48-63: "Checksum"\n64-95: "Data (variable length)"\n',
          sha256: "fb4fdb7915186d14afc27515403449129c1f0390d74f483bcddeaf730b827ce5",
          cjk: false,
        },
        {
          id: "packet/003",
          title: "Bit Numbering Order (v12.0.0+)",
          source:
            '---\nconfig:\n  packet:\n    showBits: true\n    bitOrder: descending\n    bitsPerRow: 16\n---\npacket\n0-7: "DATA"\n8-11: "TYPE"\n12: "EN"\n13-15: "RESERVED"\n',
          sha256: "16d2b45d5aab2633aade4fab58149b9f5b7d78fd96e6b5e644ab615e4a4be4e6",
          cjk: false,
        },
        {
          id: "packet/004",
          title: "Example on config and theme",
          source:
            '---\nconfig:\n  packet:\n    showBits: true\n  themeVariables:\n    packet:\n      startByteColor: red\n---\npacket\n0-15: "Source Port"\n16-31: "Destination Port"\n32-63: "Sequence Number"\n',
          sha256: "3567105d88bb41a5410baee609b4562e85c000198de3e270817aa60bb1f2ad64",
          cjk: false,
        },
      ],
    },
    {
      type: "kanban",
      name: "Kanban",
      documentation: "https://mermaid.js.org/syntax/kanban.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/kanban.md",
      cases: [
        {
          id: "kanban/001",
          title: "Overview",
          source: "kanban\n  column1[Column Title]\n    task1[Task Description]\n",
          sha256: "64d471958b3a3c6b8956c05f7f063ed9faaafec919683c3cbee90cd4a309ee5b",
          cjk: false,
        },
        {
          id: "kanban/002",
          title: "Supported Metadata Keys",
          source:
            "kanban\ntodo[Todo]\n  id3[Update Database Function]@{ ticket: MC-2037, assigned: 'knsv', priority: 'High' }\n",
          sha256: "6a07fd6d17bc2fccd049c7416db6a68bd83421271ded108812d17776373b7702",
          cjk: false,
        },
        {
          id: "kanban/003",
          title: "Full Example",
          source:
            "---\nconfig:\n  kanban:\n    ticketBaseUrl: 'https://mermaidchart.atlassian.net/browse/#TICKET#'\n---\nkanban\n  Todo\n    [Create Documentation]\n    docs[Create Blog about the new diagram]\n  [In progress]\n    id6[Create renderer so that it works in all cases. We also add some extra text here for testing purposes. And some more just for the extra flare.]\n  id9[Ready for deploy]\n    id8[Design grammar]@{ assigned: 'knsv' }\n  id10[Ready for test]\n    id4[Create parsing tests]@{ ticket: MC-2038, assigned: 'K.Sveidqvist', priority: 'High' }\n    id66[last item]@{ priority: 'Very Low', assigned: 'knsv' }\n  id11[Done]\n    id5[define getData]\n    id2[Title of diagram is more than 100 chars when user duplicates diagram with 100 char]@{ ticket: MC-2036, priority: 'Very High'}\n    id3[Update DB function]@{ ticket: MC-2037, assigned: knsv, priority: 'High' }\n\n  id12[Can't reproduce]\n    id3[Weird flickering in Firefox]\n",
          sha256: "1463e787daaa07b25d3c55218d958a02fb0f7cf9fdec59a5aacdffb1758521e0",
          cjk: false,
        },
      ],
    },
    {
      type: "architecture",
      name: "Architecture",
      documentation: "https://mermaid.js.org/syntax/architecture.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/architecture.md",
      cases: [
        {
          id: "architecture/001",
          title: "Example",
          source:
            "architecture-beta\n    group api(cloud)[API]\n\n    service db(database)[Database] in api\n    service disk1(disk)[Storage] in api\n    service disk2(disk)[Storage] in api\n    service server(server)[Server] in api\n\n    db:L -- R:server\n    disk1:T -- B:server\n    disk2:T -- B:db\n",
          sha256: "bc2e0b86f311454480f0bc4d1ccdd5dcc7c268555254f0c94aa62226b488ea65",
          cjk: false,
        },
        {
          id: "architecture/002",
          title: "Aligning siblings (v11.16.0+)",
          source:
            "architecture-beta\n    group api(cloud)[API]\n    service db1(database)[DB1] in api\n    service db2(database)[DB2] in api\n    service db3(database)[DB3] in api\n    service mcp(server)[MCP] in api\n    db1:R --> L:mcp\n    db2:R --> L:mcp\n    db3:R --> L:mcp\n    align column db1 db2 db3\n",
          sha256: "7744f879b77a36a2e681aa7705b9ea5374d0453248bb14189f776feaff91656b",
          cjk: false,
        },
        {
          id: "architecture/003",
          title: "Aligning siblings (v11.16.0+)",
          source:
            "architecture-beta\n    service src1(server)[Source 1]\n    service src2(server)[Source 2]\n    service src3(server)[Source 3]\n    service proc(server)[Processor]\n    src1:B --> T:proc\n    src2:B --> T:proc\n    src3:B --> T:proc\n    align row src1 src2 src3\n",
          sha256: "b090a75233e198930e4385d801d1eb900ee9c468867da5d82ca885bdcb756305",
          cjk: false,
        },
        {
          id: "architecture/004",
          title: "Grid layouts (combining `row` and `column`)",
          source:
            "architecture-beta\n    group sources(cloud)[Sources]\n        service src_a(server)[Source A] in sources\n        service src_b(server)[Source B] in sources\n        service src_c(server)[Source C] in sources\n\n    group storage(database)[Storage]\n        service db_one(database)[DB One] in storage\n        service db_two(database)[DB Two] in storage\n        service db_three(database)[DB Three] in storage\n\n    group output(disk)[Output]\n        service brief(disk)[Brief] in output\n        service analyst(server)[Analyst] in output\n        service delivery(cloud)[Delivery] in output\n\n    src_a:B --> T:db_one\n    src_b:B --> T:db_two\n    src_c:B --> T:db_three\n    db_two:B --> T:brief\n    brief:R --> L:analyst\n    analyst:R --> L:delivery\n\n    align row src_a src_b src_c\n    align row db_one db_two db_three\n    align row brief analyst delivery\n\n    align column src_a db_one\n    align column src_b db_two brief\n    align column src_c db_three\n",
          sha256: "35afb2a472e38d686574170f38c680ca6343fd1c69aa4b3bf86dff7f8a2a5b3c",
          cjk: false,
        },
        {
          id: "architecture/005",
          title: "Junctions",
          source:
            "architecture-beta\n    service left_disk(disk)[Disk]\n    service top_disk(disk)[Disk]\n    service bottom_disk(disk)[Disk]\n    service top_gateway(internet)[Gateway]\n    service bottom_gateway(internet)[Gateway]\n    junction junctionCenter\n    junction junctionRight\n\n    left_disk:R -- L:junctionCenter\n    top_disk:B -- T:junctionCenter\n    bottom_disk:T -- B:junctionCenter\n    junctionCenter:R -- L:junctionRight\n    top_gateway:B -- T:junctionRight\n    bottom_gateway:T -- B:junctionRight\n",
          sha256: "9d6b42afa3299dfefb29d0b9702fe733903b2e6c964c3b634b612fa47e233359",
          cjk: false,
        },
        {
          id: "architecture/006",
          title: "Icons",
          source:
            "architecture-beta\n    group api(logos:aws-lambda)[API]\n\n    service db(logos:aws-aurora)[Database] in api\n    service disk1(logos:aws-glacier)[Storage] in api\n    service disk2(logos:aws-s3)[Storage] in api\n    service server(logos:aws-ec2)[Server] in api\n\n    db:L -- R:server\n    disk1:T -- B:server\n    disk2:T -- B:db\n",
          sha256: "3ed71c734c4a703143644f85ae3bdab5979c1f1dd7a08b682be86d13b0423fac",
          cjk: false,
        },
      ],
    },
    {
      type: "radar",
      name: "Radar",
      documentation: "https://mermaid.js.org/syntax/radar.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/radar.md",
      cases: [
        {
          id: "radar/001",
          title: "Examples",
          source:
            '---\ntitle: "Grades"\n---\nradar-beta\n  axis m["Math"], s["Science"], e["English"]\n  axis h["History"], g["Geography"], a["Art"]\n  curve a["Alice"]{85, 90, 80, 70, 75, 90}\n  curve b["Bob"]{70, 75, 85, 80, 90, 85}\n\n  max 100\n  min 0\n',
          sha256: "3e866a35e9ee4a7a25fc3dfa2f4a13b1e06e1ec606675de08355cce2d8748357",
          cjk: false,
        },
        {
          id: "radar/002",
          title: "Examples",
          source:
            'radar-beta\n  title Restaurant Comparison\n  axis food["Food Quality"], service["Service"], price["Price"]\n  axis ambiance["Ambiance"]\n\n  curve a["Restaurant A"]{4, 3, 2, 4}\n  curve b["Restaurant B"]{3, 4, 3, 3}\n  curve c["Restaurant C"]{2, 3, 4, 2}\n  curve d["Restaurant D"]{2, 2, 4, 3}\n\n  graticule polygon\n  max 5\n',
          sha256: "39b48990c83837bf53d286d8c38928f35bf4864f902b2acbc90350f4177d99c0",
          cjk: false,
        },
        {
          id: "radar/003",
          title: "Example on config and theme",
          source:
            '---\nconfig:\n  radar:\n    axisScaleFactor: 0.25\n    curveTension: 0.1\n  theme: base\n  themeVariables:\n    cScale0: "#FF0000"\n    cScale1: "#00FF00"\n    cScale2: "#0000FF"\n    radar:\n      curveOpacity: 0\n---\nradar-beta\n  axis A, B, C, D, E\n  curve c1{1,2,3,4,5}\n  curve c2{5,4,3,2,1}\n  curve c3{3,3,3,3,3}\n',
          sha256: "8ac5e8cdf4bde31ea9d13949a16224fc52fb6c065b6c06f1a4fda6c2e4b9e107",
          cjk: false,
        },
      ],
    },
    {
      type: "eventmodeling",
      name: "Event Modeling",
      documentation: "https://mermaid.js.org/syntax/eventmodeling.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/eventmodeling.md",
      cases: [
        {
          id: "eventmodeling/001",
          title: "Timeline",
          source: "eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded\n",
          sha256: "8bc30355f050add9f04c66e6e7a6504e9eaea343be09f3010982e8b3ca1417e7",
          cjk: false,
        },
        {
          id: "eventmodeling/002",
          title: "Inline data",
          source:
            "eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem { description: string }\ntf 03 evt ItemAdded { description: string }\n",
          sha256: "7af74f9e828ebc3084ba7cf785a7c905ebf20ab629dbfe99f4b01e17694ca460",
          cjk: false,
        },
        {
          id: "eventmodeling/003",
          title: "Inline data",
          source:
            "eventmodeling\n\ntimeframe 01 ui CartUI\ntimeframe 02 command AddItem { description: string }\ntimeframe 03 event ItemAdded { description: string }\n",
          sha256: "10ff19b737311e89e4aa281fea02e91520130c1103c6dc6765d608bea9cecb93",
          cjk: false,
        },
        {
          id: "eventmodeling/004",
          title: "Data block",
          source:
            "eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem [[AddItem01]]\ntf 03 evt ItemAdded [[ItemAdded]]\ntf 04 cmd AddItem [[AddItem02]]\ntf 05 evt ItemAdded [[ItemAdded]]\n\ndata AddItem01 {\n  description: 'john'\n  image: 'avatar_john'\n  price: 20.4\n}\n\ndata AddItem02 {\n  description: 'jack'\n  image: 'avatar_jack'\n  price: 12.5\n}\n\ndata ItemAdded {\n  description: string\n  image: string\n  price: number\n}\n",
          sha256: "16482e95f341dafd0395e62625d5f30d36669bc09fb557c7bbd2e3186110f059",
          cjk: false,
        },
        {
          id: "eventmodeling/005",
          title: "Data block",
          source:
            "eventmodeling\n\ntimeframe 01 ui CartUI\ntimeframe 02 command AddItem [[AddItem01]]\ntimeframe 03 event ItemAdded [[ItemAdded]]\ntimeframe 04 command AddItem [[AddItem02]]\ntimeframe 05 event ItemAdded [[ItemAdded]]\n\ndata AddItem01 {\n  description: 'john'\n  image: 'avatar_john'\n  price: 20.4\n}\n\ndata AddItem02 {\n  description: 'jack'\n  image: 'avatar_jack'\n  price: 12.5\n}\n\ndata ItemAdded {\n  description: string\n  image: string\n  price: number\n}\n",
          sha256: "60ed88ab0a168f783bf271435a86f69935dc5112576c3cf6381632ecce47ae3e",
          cjk: false,
        },
        {
          id: "eventmodeling/006",
          title: "Resetting the flow",
          source:
            "eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded\n\nrf 04 evt External.InventoryChanged\ntf 05 pcr InventoryProcessor\ntf 06 cmd ChangeInventory\ntf 07 evt Cart.InventoryChanged\n",
          sha256: "af1099fbb284b4ec76e65209d42a3c915216317b193d032049fbd9b0d6e49f61",
          cjk: false,
        },
        {
          id: "eventmodeling/007",
          title: "Resetting the flow",
          source:
            "eventmodeling\n\ntimeframe 01 ui CartUI\ntimeframe 02 command AddItem\ntimeframe 03 event ItemAdded\n\nresetframe 04 event External.InventoryChanged\ntimeframe 05 processor InventoryProcessor\ntimeframe 06 command ChangeInventory\ntimeframe 07 event Cart.InventoryChanged\n",
          sha256: "106d6b780f0ab5fe79083a063cff09ed9bba59732869e46e567083fb887e1519",
          cjk: false,
        },
        {
          id: "eventmodeling/008",
          title: "Resetting the flow",
          source:
            "eventmodeling\n\ntf 01 evt ItemAdded\ntf 02 ui OtherUI\nrf 03 rmo CartItems ->> 01\n",
          sha256: "39056a94a65db550bae211f98dbaed0924adcead72e95f1fa3fe7c9c51fae206",
          cjk: false,
        },
        {
          id: "eventmodeling/009",
          title: "Multiple relations",
          source:
            "eventmodeling\n\nrf 02 evt CartCreated\nrf 03 evt ItemAdded\nrf 04 evt ItemRemoved\nrf 05 evt CartCleared\ntf 01 rmo CartUI ->> 02 ->> 03 ->> 04 ->> 05\n",
          sha256: "420a8b823865365ef1de199f1c52c3740156416a2338c6b0ff203000e25ffca2",
          cjk: false,
        },
        {
          id: "eventmodeling/010",
          title: "State Change",
          source: "eventmodeling\n\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded\n",
          sha256: "8bc30355f050add9f04c66e6e7a6504e9eaea343be09f3010982e8b3ca1417e7",
          cjk: false,
        },
        {
          id: "eventmodeling/011",
          title: "State View",
          source: "eventmodeling\n\ntf 03 evt ItemAdded\ntf 02 rmo CartItems\ntf 04 ui CartUI\n",
          sha256: "697ff74e11854d948e5a396fcff1c898536ab3577ad130115e4945c758e8334f",
          cjk: false,
        },
        {
          id: "eventmodeling/012",
          title: "Translation",
          source:
            "eventmodeling\n\ntf 03 evt External.InventoryChanged\ntf 02 pcr InventoryProcessor\ntf 04 cmd ChangeInventory\ntf 05 evt Cart.InventoryChanged\n",
          sha256: "65f1af911f10492cfa02a612663ef6b97d1d83691b090021b4cbe133ded3096b",
          cjk: false,
        },
        {
          id: "eventmodeling/013",
          title: "Swimlanes and Namespaces",
          source:
            "eventmodeling\n\nrf 01 evt Inventory.InventoryChanged\nrf 02 evt External.InventoryChanged\n",
          sha256: "73bc66ae906e75f19ff6ae882354cf75e6c42f0fcaff565754b4b1b58a859e51",
          cjk: false,
        },
      ],
    },
    {
      type: "treemap",
      name: "Treemap",
      documentation: "https://mermaid.js.org/syntax/treemap.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/treemap.md",
      cases: [
        {
          id: "treemap/001",
          title: "Basic Treemap",
          source:
            'treemap-beta\n"Category A"\n    "Item A1": 10\n    "Item A2": 20\n"Category B"\n    "Item B1": 15\n    "Item B2": 25\n',
          sha256: "bac2c087ac52db3bb7d2f750dedc6537fd473b296b7837f3ed08e695e77f1667",
          cjk: false,
        },
        {
          id: "treemap/002",
          title: "Hierarchical Treemap",
          source:
            'treemap-beta\n"Products"\n    "Electronics"\n        "Phones": 50\n        "Computers": 30\n        "Accessories": 20\n    "Clothing"\n        "Men\'s": 40\n        "Women\'s": 40\n',
          sha256: "20b3fefc8d096e4c08fe94f71198aaf094f39b91cef25e5e1a3886db9444db76",
          cjk: false,
        },
        {
          id: "treemap/003",
          title: "Treemap with Styling",
          source:
            'treemap-beta\n"Section 1"\n    "Leaf 1.1": 12\n    "Section 1.2":::class1\n      "Leaf 1.2.1": 12\n"Section 2"\n    "Leaf 2.1": 20:::class1\n    "Leaf 2.2": 25\n    "Leaf 2.3": 12\n\nclassDef class1 fill:red,color:blue,stroke:#FFD600;\n',
          sha256: "64135f10e0b3a08c4013bac21d52b6cc7f076483d80613cd5283965fd6348b00",
          cjk: false,
        },
        {
          id: "treemap/004",
          title: "Using classDef for Styling",
          source:
            'treemap-beta\n"Main"\n    "A": 20\n    "B":::important\n        "B1": 10\n        "B2": 15\n    "C": 5\n\nclassDef important fill:#f96,stroke:#333,stroke-width:2px;\n',
          sha256: "5f240e126b287f1b02a34f47d1776bc1d51a28c1d50289759ad2bbefbf16c337",
          cjk: false,
        },
        {
          id: "treemap/005",
          title: "Theme Configuration",
          source:
            '---\nconfig:\n    theme: \'forest\'\n---\ntreemap-beta\n"Category A"\n    "Item A1": 10\n    "Item A2": 20\n"Category B"\n    "Item B1": 15\n    "Item B2": 25\n',
          sha256: "9acc1e6e648be555faaaec66700176bd56ab060fd39ea8dea1dc63856ecc037c",
          cjk: false,
        },
        {
          id: "treemap/006",
          title: "Diagram Padding",
          source:
            '---\nconfig:\n  treemap:\n    diagramPadding: 200\n---\ntreemap-beta\n"Category A"\n    "Item A1": 10\n    "Item A2": 20\n"Category B"\n    "Item B1": 15\n    "Item B2": 25\n',
          sha256: "8b628158795a4271eef818290ce69fbcc538b478964708158c3749545c6f49a5",
          cjk: false,
        },
        {
          id: "treemap/007",
          title: "Value Formatting",
          source:
            '---\nconfig:\n  treemap:\n    valueFormat: \'$0,0\'\n---\ntreemap-beta\n"Budget"\n    "Operations"\n        "Salaries": 700000\n        "Equipment": 200000\n        "Supplies": 100000\n    "Marketing"\n        "Advertising": 400000\n        "Events": 100000\n',
          sha256: "19c01aaa93ab7b483989288a1de86900bd0b0ece6d3d094176d80c23e5c51db3",
          cjk: false,
        },
        {
          id: "treemap/008",
          title: "Value Formatting",
          source:
            '---\nconfig:\n  treemap:\n    valueFormat: \'$.1%\'\n---\ntreemap-beta\n"Market Share"\n    "Company A": 0.35\n    "Company B": 0.25\n    "Company C": 0.15\n    "Others": 0.25\n',
          sha256: "9c4e6d63b7c161fc8d1f2a4bf443f80308ebdcbba259a8b789cf27e049b66830",
          cjk: false,
        },
      ],
    },
    {
      type: "venn",
      name: "Venn",
      documentation: "https://mermaid.js.org/syntax/venn.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/venn.md",
      cases: [
        {
          id: "venn/001",
          title: "With the defaults",
          source:
            'venn-beta\n  title What makes a good feature\n  set Desirable\n  set Feasible\n  set Viable\n  union Desirable,Feasible["Buildable"]\n  union Feasible,Viable["Sustainable"]\n  union Desirable,Viable["Marketable"]\n  union Desirable,Feasible,Viable["Ship it"]\n',
          sha256: "9a53dbe64737af6c6a6077c0535c9b11efb48852507a41b09986131bfa25d8e8",
          cjk: false,
        },
        {
          id: "venn/002",
          title: "The previous appearance",
          source:
            '---\nconfig:\n  theme: default\n  look: classic\n---\nvenn-beta\n  title What makes a good feature\n  set Desirable\n  set Feasible\n  set Viable\n  union Desirable,Feasible["Buildable"]\n  union Feasible,Viable["Sustainable"]\n  union Desirable,Viable["Marketable"]\n  union Desirable,Feasible,Viable["Ship it"]\n',
          sha256: "7401455503e883e6fad91595b62f5c18abc4590bc5e1c0eb482c3a42af3d4669",
          cjk: false,
        },
        {
          id: "venn/003",
          title: "Syntax",
          source:
            'venn-beta\n  title "Team overlap"\n  set Frontend\n  set Backend\n  union Frontend,Backend["APIs"]\n',
          sha256: "7e1f629a073676a8e78837478b7c4351f087e557dd39b9ea1d7ecd0afd9f72ce",
          cjk: false,
        },
        {
          id: "venn/004",
          title: "Labels",
          source: 'venn-beta\n  set A["Alpha"]\n  set B["Beta"]\n  union A,B["AB"]\n',
          sha256: "43f17aa16bc5089591c27ba192a68d4a5cbc0347cdb2c191b3880888b963ad62",
          cjk: false,
        },
        {
          id: "venn/005",
          title: "Higher-arity unions",
          source:
            'venn-beta\n  set Desirable\n  set Feasible\n  set Viable\n  union Desirable,Feasible,Viable["Innovation"]\n',
          sha256: "4ac8b1e3dba7ce46abbff95c8c85381f435b589cf371f01bfb0ce708d3b92db1",
          cjk: false,
        },
        {
          id: "venn/006",
          title: "Sizes",
          source: 'venn-beta\n  set A["Alpha"]:20\n  set B["Beta"]:12\n  union A,B["AB"]:3\n',
          sha256: "dbe2e15b8822e28a45210626bc600ead36dd030635490449f24091d953008c18",
          cjk: false,
        },
        {
          id: "venn/007",
          title: "Text nodes",
          source:
            'venn-beta\n  set A["Frontend"]\n    text A1["React"]\n    text A2["Design Systems"]\n  set B["Backend"]\n    text B1["API"]\n  union A,B["Shared"]\n    text AB1["OpenAPI"]\n',
          sha256: "cd2ead2b0d04ca5fea96f276e9c180af2f1ae4eadbefe3ad7b14d535a2113a0e",
          cjk: false,
        },
        {
          id: "venn/008",
          title: "Styling",
          source:
            'venn-beta\n  set A["Alpha"]:20\n    text A1["React"]\n    text A2["Design Systems"]\n  set B["Beta"]:12\n  union A,B["AB"]:3\n  style A fill:#ff6b6b\n  style A,B color:#333\n  style A1 color:red\n',
          sha256: "ac6de7c7813c6c4454972305ae734176395f3dc5b0be2c4ada601bd25815455d",
          cjk: false,
        },
      ],
    },
    {
      type: "ishikawa",
      name: "Ishikawa",
      documentation: "https://mermaid.js.org/syntax/ishikawa.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/ishikawa.md",
      cases: [
        {
          id: "ishikawa/001",
          title: "Syntax",
          source:
            "ishikawa-beta\n    Blurry Photo\n    Process\n        Out of focus\n        Shutter speed too slow\n        Protective film not removed\n        Beautification filter applied\n    User\n        Shaky hands\n    Equipment\n        LENS\n            Inappropriate lens\n            Damaged lens\n            Dirty lens\n        SENSOR\n            Damaged sensor\n            Dirty sensor\n    Environment\n        Subject moved too quickly\n        Too dark\n",
          sha256: "b3ea7b01b554303df1a9a770154f4c9c2481fc734f9ccd6fa31857f3cb576c61",
          cjk: false,
        },
      ],
    },
    {
      type: "wardley",
      name: "Wardley",
      documentation: "https://mermaid.js.org/syntax/wardley.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/wardley.md",
      cases: [
        {
          id: "wardley/001",
          title: "Basic Example",
          source:
            'wardley-beta\ntitle Tea Shop Value Chain\n\nanchor Business [0.95, 0.63]\ncomponent Cup of Tea [0.79, 0.61]\ncomponent Tea [0.63, 0.81]\ncomponent Hot Water [0.52, 0.80]\ncomponent Kettle [0.43, 0.35]\ncomponent Power [0.10, 0.70]\n\nBusiness -> Cup of Tea\nCup of Tea -> Tea\nCup of Tea -> Hot Water\nHot Water -> Kettle\nKettle -> Power\n\nevolve Kettle 0.62\nevolve Power 0.89\n\nnote "Standardising power allows Kettles to evolve faster" [0.30, 0.49]\n',
          sha256: "ee7968c51b2dfc9443b85181069d6e7ce0e88e16f41da8bc63f8f815316a1f33",
          cjk: false,
        },
        {
          id: "wardley/002",
          title: "Diagram Declaration",
          source: "wardley-beta\ntitle Your Map Title\nsize [1100, 600]\n",
          sha256: "30bd5186b8416c3fb616fdae8d8ce7e18c7c61a1051241fb9dbf8a0c409b9d84",
          cjk: false,
        },
        {
          id: "wardley/003",
          title: "Coordinate System",
          source:
            "wardley-beta\ntitle Coordinate Examples\n\ncomponent Infrastructure [0.30, 0.20]        %% Low visibility, low evolution\ncomponent Product [0.70, 0.60]               %% High visibility, mid evolution\ncomponent User Need [0.90, 0.95]             %% High visibility, high evolution\n",
          sha256: "c8a676b374edb4685f898083fda07254e83d20a99b6c0714691de2edc25275a1",
          cjk: false,
        },
        {
          id: "wardley/004",
          title: "Components",
          source:
            'wardley-beta\ntitle Components\n\ncomponent API [0.60, 0.70]\ncomponent Database [0.40, 0.85] label [-50, 10]\ncomponent "Custom Service" [0.55, 0.35]\n',
          sha256: "24cf67f618fb8e525cff0e19dc150e3aaa5f2c9da202dab5286b7ef4f777aeac",
          cjk: false,
        },
        {
          id: "wardley/005",
          title: "Components",
          source:
            "wardley-beta\ntitle Hyphenated Names\n\ncomponent real-time processing [0.55, 0.40]\ncomponent end-user [0.90, 0.95]\n\nend-user -> real-time processing\n",
          sha256: "f8939bf3c47509e8035cbb9d4ad6bb2aab271053ce06e3e70053e9836053e9a0",
          cjk: false,
        },
        {
          id: "wardley/006",
          title: "Anchors",
          source:
            "wardley-beta\ntitle Anchors\n\nanchor Customer [0.90, 0.95]\nanchor Business [0.85, 0.90]\n\ncomponent Service [0.70, 0.75]\n\nCustomer -> Service\nBusiness -> Service\n",
          sha256: "0dba7eb5e8a69ad3fdcbba439fdee4c109d6fa1cc43c70b6cad38894a8fce8cf",
          cjk: false,
        },
        {
          id: "wardley/007",
          title: "Inertia",
          source:
            "wardley-beta\ntitle Inertia\n\ncomponent Legacy System [0.45, 0.40] (inertia)\ncomponent New Platform [0.65, 0.45]\n\nLegacy System -> New Platform\n",
          sha256: "eaade9886d10fc14ed5d82780730416074b7ede8a5c1a400b8b56447f0a5fc51",
          cjk: false,
        },
        {
          id: "wardley/008",
          title: "Source Strategy",
          source:
            "wardley-beta\ntitle Sourcing Strategy\n\nanchor Customer [0.80, 0.95]\ncomponent Custom App [0.45, 0.85] (build)\ncomponent Off-the-shelf Tool [0.85, 0.65] (buy)\ncomponent Managed Service [0.60, 0.40] (outsource)\ncomponent Cloud Platform [0.95, 0.25] (market)\n\nCustomer -> Custom App\nCustom App -> Off-the-shelf Tool\nCustom App -> Managed Service\nOff-the-shelf Tool -> Cloud Platform\n",
          sha256: "6ac86d29b6ee9eca20e2937209965a23fb16c4215db589cda223257a527502cb",
          cjk: false,
        },
        {
          id: "wardley/009",
          title: "Links and Dependencies",
          source:
            "wardley-beta\ntitle Link Types\n\ncomponent User [0.90, 0.95]\ncomponent App [0.75, 0.75]\ncomponent API [0.60, 0.60]\ncomponent Cache [0.65, 0.45]\ncomponent Database [0.15, 0.80]\n\nUser -> App\nApp +> API\nAPI -> Database\nAPI +<> Cache\nCache +'backup'> Database\n",
          sha256: "d1f89162a665f281c200fdf9e51f7cf0ffb906ad95f07139350b8cce8eddbc04",
          cjk: false,
        },
        {
          id: "wardley/010",
          title: "Evolution Arrows",
          source:
            "wardley-beta\ntitle Evolution\n\ncomponent Database [0.40, 0.50]\ncomponent API [0.55, 0.60]\n\nDatabase -> API\n\nevolve Database 0.75\nevolve API 0.80\n",
          sha256: "bd99ec4274a9f135a1a53d676b84c16b339061161a6ddd26365e69101900efdd",
          cjk: false,
        },
        {
          id: "wardley/011",
          title: "Pipelines",
          source:
            'wardley-beta\ntitle Pipeline Evolution\n\ncomponent Database [0.40, 0.60]\n\npipeline Database {\n  component "File System" [0.25]\n  component "SQL DB" [0.50]\n  component "NoSQL" [0.70]\n  component "Cloud DB" [0.85]\n}\n',
          sha256: "16bd41b8a1695cacd246fc314605faa1a0b63b48057f618d15869437039ae904",
          cjk: false,
        },
        {
          id: "wardley/012",
          title: "Custom Evolution Stages",
          source:
            "wardley-beta\ntitle Custom Stages\n\nevolution Unmodelled -> Divergent -> Convergent -> Modelled\n\ncomponent Raw Data [0.15, 0.20]\ncomponent Analysis [0.45, 0.50]\ncomponent Reports [0.75, 0.70]\n",
          sha256: "29e13a0716dacc33a519c53c2e1938d1ff10b1d7816f8670c36a8d809536fc95",
          cjk: false,
        },
        {
          id: "wardley/013",
          title: "Dual Labels",
          source:
            "wardley-beta\ntitle Dual Label Stages\n\nevolution Genesis / Concept -> Custom / Emerging -> Product / Converging -> Commodity / Accepted\n\ncomponent Novel Idea [0.05, 0.20]\ncomponent Custom Solution [0.35, 0.50]\ncomponent Product [0.65, 0.70]\ncomponent Utility [0.95, 0.90]\n",
          sha256: "78f1f8e0586b761be1117216c419c04b8052a2bafeb249167bc9f46d54262114",
          cjk: false,
        },
        {
          id: "wardley/014",
          title: "Custom Stage Widths",
          source:
            "wardley-beta\ntitle Custom Widths\n\nevolution Genesis@0.2 -> Custom@0.4 -> Product@0.75 -> Commodity@1.0\n\ncomponent Novel [0.75, 0.15]\ncomponent Bespoke [0.70, 0.35]\ncomponent Product [0.65, 0.65]\ncomponent Utility [0.60, 0.90]\n",
          sha256: "fa9bb1266991355279e56a195611875db2ee1d573bec561ad6d003205bcaec97",
          cjk: false,
        },
        {
          id: "wardley/015",
          title: "Notes",
          source:
            'wardley-beta\ntitle Notes\n\ncomponent API [0.60, 0.70]\ncomponent Database [0.40, 0.50]\n\nAPI -> Database\n\nnote "Critical decision point" [0.65, 0.55]\nnote "High risk area" [0.40, 0.35]\n',
          sha256: "6ba6230ffb4f7a616f755efbead5d064a3f8f736344bc3a58edcf9b0e4bca3bd",
          cjk: false,
        },
        {
          id: "wardley/016",
          title: "Numbered Annotations",
          source:
            'wardley-beta\ntitle Annotations\n\ncomponent API [0.60, 0.70]\ncomponent Cache [0.50, 0.55]\ncomponent Database [0.40, 0.40]\n\nAPI -> Cache\nCache -> Database\n\nannotations [0.10, 0.90]\nannotation 1,[0.60, 0.65] "Critical component"\nannotation 2,[0.50, 0.50] "Performance layer"\nannotation 3,[0.40, 0.35] "Data persistence"\n',
          sha256: "c5d091f2bc8cb332f8c664b1b6ef7f5d84180de70b408ab9a554378ebe7575c4",
          cjk: false,
        },
        {
          id: "wardley/017",
          title: "Accelerators and Deaccelerators",
          source:
            'wardley-beta\ntitle Forces\n\ncomponent Legacy [0.20, 0.85]\ncomponent Modern [0.55, 0.60]\ncomponent AI [0.70, 0.35]\n\nLegacy -> Modern\nModern -> AI\n\naccelerator "AI Adoption" [0.55, 0.25]\ndeaccelerator "Legacy Constraints" [0.15, 0.75]\n',
          sha256: "fcf464d599f56ace59801857adef1ddfd91e5f55d45fd99d531f29d10669ca1d",
          cjk: false,
        },
        {
          id: "wardley/018",
          title: "Custom Canvas Size",
          source: "wardley-beta\ntitle Custom Size\nsize [800, 1000]\n",
          sha256: "d85436bace2b6f1942183f8e730102db8c071db9b7f178683dfacfdb7db03b42",
          cjk: false,
        },
        {
          id: "wardley/019",
          title: "Complete Example",
          source:
            'wardley-beta\ntitle Software Platform Strategy\nsize [1100, 800]\n\nevolution Genesis@0.25 -> Custom@0.5 -> Product@0.75 -> Commodity@1.0\n\nanchor Customer [0.90, 0.95]\n\ncomponent "Mobile App" [0.80, 0.85] (build)\ncomponent "Web App" [0.75, 0.80] label [-60, 10] (build)\ncomponent "API Gateway" [0.70, 0.65] (buy)\ncomponent "Auth Service" [0.60, 0.55] (outsource)\ncomponent "Database" [0.50, 0.45] (buy) (inertia)\ncomponent "Cloud Platform" [0.30, 0.95] (market)\n\nCustomer -> "Mobile App"\nCustomer -> "Web App"\n"Mobile App" -> "API Gateway"\n"Web App" -> "API Gateway"\n"API Gateway" -> "Auth Service"\n"API Gateway" -> "Database"\n"Database" -> "Cloud Platform"\n\nevolve "API Gateway" 0.85\nevolve "Database" 0.75\n\naccelerator "Cloud Native" [0.20, 0.85]\ndeaccelerator "Legacy Data" [0.45, 0.35]\n\nannotations [0.10, 0.20]\nannotation 1,[0.78, 0.82] "User touchpoints"\nannotation 2,[0.70, 0.60] "Integration layer"\nannotation 3,[0.50, 0.40] "Data persistence"\n\nnote "Build mobile-first experience" [0.85, 0.90]\nnote "Migrate to cloud-native database" [0.60, 0.50]\n',
          sha256: "4be02ccb84d6157ab23d3230ed66a7404d181d8bc950328e46d460d142c21d81",
          cjk: false,
        },
      ],
    },
    {
      type: "cynefin",
      name: "Cynefin",
      documentation: "https://mermaid.js.org/syntax/cynefin.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/cynefin.md",
      cases: [
        {
          id: "cynefin/001",
          title: "Basic example",
          source:
            'cynefin-beta\n  title Incident Response\n\n  complex\n    "Investigate root cause"\n    "Run chaos experiment"\n\n  complicated\n    "Analyze performance data"\n    "Expert review needed"\n\n  clear\n    "Restart service"\n    "Apply known fix"\n\n  chaotic\n    "Page on-call immediately"\n\n  confusion\n    "Unknown failure mode"\n',
          sha256: "4fb60908c114c6b9de99bada4c8fef8313803485baf1710b05a48d7ea97afe1f",
          cjk: false,
        },
        {
          id: "cynefin/002",
          title: "With transitions",
          source:
            'cynefin-beta\n  title Strategy Categorization\n\n  complex\n    "Market research"\n\n  complicated\n    "Competitive analysis"\n\n  clear\n    "Standard pricing"\n\n  chaotic\n    "Crisis management"\n\n  complex --> complicated : "Pattern identified"\n  complicated --> clear : "Best practice codified"\n  clear --> chaotic : "Complacency"\n  chaotic --> complex : "Stabilized"\n',
          sha256: "1065e06731e402659b34812e745185f06b3dca903d134d601efc9878c9b3ca46",
          cjk: false,
        },
        {
          id: "cynefin/003",
          title: "Empty framework",
          source:
            "cynefin-beta\n  title Cynefin Framework\n\n  complex\n  complicated\n  clear\n  chaotic\n",
          sha256: "c41ec80b216c2903964da56bfa712d0877bc80fcc57c3e4584dc1ce3c86a53ec",
          cjk: false,
        },
      ],
    },
    {
      type: "treeView",
      name: "TreeView",
      documentation: "https://mermaid.js.org/syntax/treeView.html",
      url: "https://raw.githubusercontent.com/mermaid-js/mermaid/97b345154f2cd71f23a2aadb14af6dad46f63173/packages/mermaid/src/docs/syntax/treeView.md",
      cases: [
        {
          id: "treeView/001",
          title: "Box-Drawing Input",
          source:
            "treeView-beta\n├── src/\n│   ├── index.ts\n│   └── utils.ts\n├── package.json\n└── README.md\n",
          sha256: "6b40fe28208f35810316ecd57767eb55ba684ab1a8962971957fe5e5c99758b3",
          cjk: false,
        },
        {
          id: "treeView/002",
          title: "Box-Drawing Input",
          source:
            "treeView-beta\n├── src/\n│   ├── App.tsx :::highlight icon(logos:react) ## main component\n│   └── index.ts ## entry point\n├── .env ## environment variables\n├── Dockerfile\n└── package.json\n",
          sha256: "39fe66e893ae8c0da65ac1064539b98e89923ad4f817121bc3de7f53570e44cf",
          cjk: false,
        },
        {
          id: "treeView/003",
          title: "Box-Drawing Input",
          source:
            "treeView-beta\n├── packages/\n│   ├── mermaid/\n│   │   ├── src/\n│   │   │   ├── parser.ts\n│   │   │   └── renderer.ts\n│   │   └── package.json\n│   └── parser/\n│       └── src/\n└── README.md\n",
          sha256: "3056eee3048bf0906f3972a1b7688b23295ca7b0b2bb3b10e246d723f1fee8cd",
          cjk: false,
        },
        {
          id: "treeView/004",
          title: "Highlighting with :::class",
          source:
            "treeView-beta\n    src/\n        App.tsx :::highlight\n        index.js\n    package.json\n",
          sha256: "9a7ffe1ec7b32a9a1ffa132495b9fcbc180b9851b988d64f8a387fb211488258",
          cjk: false,
        },
        {
          id: "treeView/005",
          title: "Inline descriptions with `##`",
          source:
            "treeView-beta\n    src/\n        index.js ## app entry point\n        config.ts ## runtime configuration\n    package.json ## project manifest\n",
          sha256: "04e61b50f48a3523a42e357b1355c89b701033838f1d7168598d60d8903a6829",
          cjk: false,
        },
        {
          id: "treeView/006",
          title: "Icons",
          source:
            "---\nconfig:\n  treeView:\n    showIcons: true\n---\ntreeView-beta\n    src/\n        index.js\n    package.json\n",
          sha256: "4d3420e45f7a8f7ddd22a17fa871df376a407c169ce1d7d6d0aaf53e97642690",
          cjk: false,
        },
        {
          id: "treeView/007",
          title: "File-type icons via config maps",
          source:
            "---\nconfig:\n  treeView:\n    showIcons: true\n    defaultIconPack: material-icon-theme\n    filenameIcons:\n      Dockerfile: docker\n    extensionIcons:\n      .ts: typescript\n      .tsx: react-ts\n      .txt: none\n---\ntreeView-beta\n    src/\n        App.tsx\n        utils.ts\n    Dockerfile\n    notes.txt\n    README.md\n",
          sha256: "713fb18511ddb1cca29c48c0ef6d72938897a97b4b42d2d9d51e504fdeec5e68",
          cjk: false,
        },
        {
          id: "treeView/008",
          title: "Icon overrides with icon()",
          source:
            "treeView-beta\n    src/\n        App.tsx icon(logos:react)\n        index.js\n    package.json\n",
          sha256: "a20065d1be5d947af45a113928f47fcce1da6926d69a2a577034d104b34fecf8",
          cjk: false,
        },
        {
          id: "treeView/009",
          title: "Hiding icons",
          source:
            "---\nconfig:\n  treeView:\n    showIcons: true\n---\ntreeView-beta\n    src/\n        index.js icon(none)\n    package.json\n",
          sha256: "8fefcf2b5cab12a09b6c026cdaaab515da9ce343d2d5f7a8bb4d5121d61a369c",
          cjk: false,
        },
        {
          id: "treeView/010",
          title: "Combined annotations",
          source:
            "treeView-beta\n    my-project/\n        src/\n            App.tsx :::highlight icon(logos:react) ## main component\n            index.js ## entry point\n        .env ## environment variables\n        Dockerfile\n        package.json\n",
          sha256: "1d23e1ff0c7afdda9070693794d0fd8a07de7666ea15aa57b6e1a3b92cba8643",
          cjk: false,
        },
        {
          id: "treeView/011",
          title: "Examples",
          source:
            'treeView-beta\n    "packages"\n        "mermaid"\n            "src"\n        "parser"\n',
          sha256: "47b72aedb6fc36c74e7a3aa8c0f17e473766a97cf0a67f66b2523ddb24e2fae1",
          cjk: false,
        },
        {
          id: "treeView/012",
          title: "Examples",
          source:
            "treeView-beta\n    🚀 rocket-app/\n        📦 packages/\n            🎨 ui/\n            🛠️ utils/\n        🧪 tests/\n        📝 README.md\n        ⚙️ config.yaml\n",
          sha256: "3a512e31979952f0789ed02a01b1e4bffd0b69d19f250d2d39574ca29dfc71e3",
          cjk: false,
        },
        {
          id: "treeView/013",
          title: "Examples",
          source:
            '---\nconfig:\n    treeView:\n        rowIndent: 80\n        lineThickness: 3\n    themeVariables:\n        treeView:\n            labelFontSize: \'20px\'\n            labelColor: \'#FF0000\'\n            lineColor: \'#00FF00\'\n---\ntreeView-beta\n    "packages"\n        "mermaid"\n            "src"\n        "parser"\n',
          sha256: "3cb8979e83d9be9fb2c37406987b1e3c3fe17d171d7948f4d34a9aed1418abea",
          cjk: false,
        },
      ],
    },
  ],
} as const;
