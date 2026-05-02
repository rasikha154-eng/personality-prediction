from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="Minej/bert-base-personality",
    local_dir=r"C:\personality-prediction\backend\personality_app\models\bigfive-regression-model"
)
print("Download complete!")