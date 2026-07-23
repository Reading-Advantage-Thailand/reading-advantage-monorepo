import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from import_elvgames_assets import import_pixel_art

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32

class ImportElvGamesAssetsTest(unittest.TestCase):
    def write_zip(self, path: Path, entries: dict[str, bytes]) -> None:
        with zipfile.ZipFile(path, "w") as archive:
            for name, data in entries.items():
                archive.writestr(name, data)

    def test_imports_top_level_and_nested_pngs_with_source_receipts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = io.BytesIO()
            with zipfile.ZipFile(nested, "w") as archive:
                archive.writestr("Extra Pack/Hit Spark.png", PNG)
            self.write_zip(root / "User Interface.zip", {
                "User Interface/Controls 16x16/Gold Coin.png": PNG,
                "User Interface/Extras.zip": nested.getvalue(),
                "User Interface/License.txt": b"Credits to ElvGames",
                "User Interface/ignore.exe": b"not pixel art",
            })
            destination = root / "standard"
            result = import_pixel_art(root, destination)
            self.assertEqual(result.discovered_pngs, 2)
            self.assertEqual(result.imported_pngs, 2)
            self.assertTrue(any(path.startswith("ui/16x16/") for path in result.destinations))
            self.assertTrue(any(path.startswith("ui/native/") for path in result.destinations))
            receipt = (destination / "IMPORT-RECEIPT.tsv").read_text()
            self.assertIn("User Interface.zip", receipt)
            self.assertIn("Extras.zip", receipt)
            licenses = (destination / "LICENSE-RECEIPT.tsv").read_text()
            self.assertIn("License.txt", licenses)
            self.assertEqual(len(list((destination / "licenses").rglob("*.txt"))), 1)

if __name__ == "__main__":
    unittest.main()
