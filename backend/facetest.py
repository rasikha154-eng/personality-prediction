import os
import sys

# TensorFlow Python 3.11 path explicitly add karo
PY311_SITE_PACKAGES = r"C:\Users\rasik\AppData\Local\Programs\Python\Python311\Lib\site-packages"
if PY311_SITE_PACKAGES not in sys.path:
    sys.path.insert(0, PY311_SITE_PACKAGES)

import cv2
import numpy as np
from PIL import Image

EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "_mini_XCEPTION.102-0.66.hdf5")
_emotion_model = None

# ... baaki code same rahega