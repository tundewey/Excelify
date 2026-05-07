from fastapi import APIRouter, UploadFile, File
from app.utils.text_chunker import chunk_text
from app.services.embedding_service import embed_texts

# from app.db.vector_store import VectorStore
from app.db.store import vector_store

router = APIRouter()

# vector_store = VectorStore(dim=384)  # MiniLM output size


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8")

    chunks = chunk_text(text)

    embeddings = embed_texts(chunks)
    print(embeddings.shape)
    vector_store.add(embeddings, chunks)

    return {
        "filename": file.filename,
        "num_chunks": len(chunks),
        "message": "Document processed",
        "sample_chunk": chunks[0] if chunks else None,
    }
