import os
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore

# Your Pinecone Key
os.environ['PINECONE_API_KEY'] = 'pcsk_2aMSFZ_26e5WT9XGPnTUpM4cJrajfApZkHew4HHAn5fPc8xFMHavkYU2qS3mtsqqquFES6'

print("1. Reading the PDF...")
loader = PyMuPDFLoader("JEE_Main.pdf")
docs = loader.load()

print("2. Chopping the document into small paragraphs...")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = text_splitter.split_documents(docs)

print("3. Downloading the Embeddings AI...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

print("4. Uploading to Pinecone Vector Database...")
index_name = "enterprise-rag" # Make sure this matches your exact Pinecone index name!
vectorstore = PineconeVectorStore.from_documents(chunks, embeddings, index_name=index_name)

print("✅ Upload Complete! Your PDF is permanently stored in Pinecone.")