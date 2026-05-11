from sentence_transformers import SentenceTransformer

# model = SentenceTransformer("all-MiniLM-L6-v2")

# def embed_texts(texts: list[str]):
#     return model.encode(texts)

_model = None
def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

    
def embed_texts(texts: list[str]):
    model = _get_model()
    return model.encode(texts)