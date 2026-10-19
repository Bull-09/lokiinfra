import sys, pathlib
S = pathlib.Path("/Users/lokeshshinkar/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/9515f30f-6f22-4f2d-a0ee-1634e52c45f6/96d0d031-7069-4dbe-b86f-750bd5701e14/skills/hairline-create")
fig, out = sys.argv[1], sys.argv[2]
k = (S/"kernel.js").read_text().replace("\r\n","\n").rstrip()
b = (S/"bench.html").read_text().replace("\r\n","\n")
f = pathlib.Path(fig).read_text().replace("\r\n","\n").strip()
b = b.replace("/*KERNEL*/", "\n"+k+"\n", 1).replace("/*FIGURE*/", "\n"+f+"\n", 1)
pathlib.Path(out).write_text(b); print(out)
