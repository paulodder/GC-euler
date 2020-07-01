import pandas as pd
import shlex
import os
import subprocess
import matplotlib.pyplot as plt
from matplotlib.colors import rgb2hex, hex2color
from pathlib import Path
import json

suffix = "_v3_corr"
data_dir = Path("static/data/")
df = pd.read_excel(data_dir / f"data{suffix}.xlsx")
df.to_csv(data_dir / f"data{suffix}.csv", index=False)
df = pd.read_csv(data_dir / f"data{suffix}.csv").fillna(-1)
df[df.columns[:8]].to_csv(data_dir / "data_for_download.csv", index=False)
# [rgb2hex(cmap(x)) for x in range(12)]

# col_name2id_name = {
#     "hPGCs_week_5-8_(max_of_f_or_m)": "hpgc",
#     "PGCLCs_week_2-3_(average)": "pgclc",
#     "GTEx_max_expr_(excl_gonads)": "gtex",
#     "TCGA_max_expr": "tcga",
# }
col_name2id_name = {
    "hPGCs: Highest minimum expr in either male or female cells (Irie et al. 2015)": "hpgc",
    "PGCLCs: average of 2 samples (corrected for gene length) (Irie et al. 2015)": "pgclc",
    "GTEX (non-cancerous somatic tissues): max. expr (excluding gonads)": "gtex",
    "TCGA (tumor samples): Max. expr": "tcga",
}
id_name2col_name = dict((v, k) for k, v in col_name2id_name.items())

for id_name, col_name in id_name2col_name.items():
    with open(data_dir / f"{id_name}.json", "w") as f:
        print(col_name, len(list(df[col_name].values)))
        json.dump(list(df[col_name].fillna(-1).values), f)

with open(data_dir / f"min_hpgc_pgclc.json", "w") as f:
    json.dump(
        list(df[[id_name2col_name["hpgc"], id_name2col_name["pgclc"]]].min(1)),
        f,
    )


# for id_name, col_name in zip(["a", "b", "c"], ["A", "B", "C"]):
#     with open(data_dir / f"{id_name}.json", "w") as f:
#         print(col_name, len(list(subdf[col_name].values)))
#         json.dump(list(df[col_name].values), f)

# make bool idxs vectors for oncogene article and ct genes
previous_gene_codes = pd.read_excel(
    data_dir / f"data{suffix}.xlsx",
    sheet_name="In Oncogene article (n = 756)",
    header=None,
)
previous_gene_bool_idx = (
    df["Gene ID"].isin(previous_gene_codes[0].values).astype(int)
)
with open(data_dir / f"brug2017.json", "w") as f:
    json.dump(list(map(int, previous_gene_bool_idx.values)), f)
CT_gene_codes = pd.read_excel(
    data_dir / f"data{suffix}.xlsx",
    sheet_name="CT genes (n = 1128)",
    header=None,
)
CT_gene_bool_idx = df["Gene ID"].isin(CT_gene_codes[0].values).astype(int)
with open(data_dir / f"CT.json", "w") as f:
    json.dump(list(map(int, CT_gene_bool_idx.values)), f)


# for fname in os.listdir(data_dir):
#     if any(fname.endswith(suffix) for suffix in ["json", "csv"]):
#         print(fname)
#         subprocess.Popen(shlex.split(f))

# {(a, f'rgba({tuple(map(lambda x: round(x, 3), hex2color(b)))})') for a,b in id_name2hex.items()}
# {

id_name2hex = {
    "gtex": "#76C25B",
    "tcga": "#B35A5A",
    "hpgc": "#FCD5B4",
    "pgclc": "#a6cee3",
}
{
    (a, tuple(map(lambda x: round(x, 3), hex2color(b))))
    for a, b in id_name2hex.items()
}
