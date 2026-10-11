import 'package:flutter/material.dart';
import 'package:second_brain_mobile/features/blocks/block_models.dart';

/// Renders a [Block] as a Flutter widget.
/// This is the "explicit adapter" between the canonical block schema and Flutter rendering.
class BlockRenderer extends StatelessWidget {
  final Block block;

  const BlockRenderer({
    required this.block,
    super.key,
  });

  /// Get the text content for a block
  String _getText() {
    final richText = block.content as Map<String, dynamic>?;
    final runs = richText?['rich_text'] as List<dynamic>?;

    if (runs == null || runs.isEmpty) {
      return '';
    }

    final firstRun = runs.first as Map<String, dynamic>?;
    return firstRun?['text'] as String? ?? '';
  }

  /// Get the heading level if applicable
  int? _getHeadingLevel() {
    final richText = block.content as Map<String, dynamic>?;
    return richText?['level'] as int?;
  }

  /// Get the checked state if it's a todo
  bool? _getTodoChecked() {
    final richText = block.content as Map<String, dynamic>?;
    return richText?['checked'] as bool?;
  }

  /// Get the URL if it's a link
  String? _getLinkUrl() {
    final richText = block.content as Map<String, dynamic>?;
    final content = richText?['content'] as Map<String, dynamic>?;
    return content?['url'] as String?;
  }

  /// Get the label if it's a link
  String? _getLinkLabel() {
    final richText = block.content as Map<String, dynamic>?;
    final content = richText?['content'] as Map<String, dynamic>?;
    return content?['label'] as String?;
  }

  /// Get the attachment ID if it's an image
  String? _getImageAttachmentId() {
    final richText = block.content as Map<String, dynamic>?;
    final content = richText?['content'] as Map<String, dynamic>?;
    return content?['attachment_id'] as String?;
  }

  /// Get the display name if it's a file
  String? _getFileDisplayName() {
    final richText = block.content as Map<String, dynamic>?;
    final content = richText?['content'] as Map<String, dynamic>?;
    return content?['display_name'] as String?;
  }

  /// Get the page ID if it's a child page
  String? _getChildPageId() {
    final richText = block.content as Map<String, dynamic>?;
    final content = richText?['content'] as Map<String, dynamic>?;
    return content?['page_id'] as String?;
  }

  @override
  Widget build(BuildContext context) {
    final type = block.type;

    switch (type) {
      case 'paragraph':
        return _buildParagraph();

      case 'heading':
        return _buildHeading();

      case 'bulleted_list_item':
        return _buildBulletedListItem();

      case 'numbered_list_item':
        return _buildNumberedListItem();

      case 'todo':
        return _buildTodo();

      case 'quote':
        return _buildQuote();

      case 'code':
        return _buildCode();

      case 'divider':
        return _buildDivider();

      case 'callout':
        return _buildCallout();

      case 'link':
        return _buildLink();

      case 'image':
        return _buildImage();

      case 'file':
        return _buildFile();

      case 'child_page':
        return _buildChildPage();

      default:
        return _buildUnsupported();
    }
  }

  Widget _buildParagraph() {
    final text = _getText();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text.isEmpty ? 'Tap to add text' : text,
        style: const TextStyle(fontSize: 16),
      ),
    );
  }

  Widget _buildHeading() {
    final level = _getHeadingLevel() ?? 1;
    final text = _getText();
    final titleStyle = level == 1
        ? const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)
        : level == 2
            ? const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
            : const TextStyle(fontSize: 16, fontWeight: FontWeight.bold);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text.isEmpty ? 'Heading $level' : text,
        style: titleStyle,
      ),
    );
  }

  Widget _buildBulletedListItem() {
    final text = _getText();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.remove_circle_outline,
              size: 20, color: Colors.grey),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text.isEmpty ? 'New item' : text,
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberedListItem() {
    final text = _getText();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('1.', style: TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text.isEmpty ? 'New item' : text,
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodo() {
    final checked = _getTodoChecked() ?? false;
    final text = _getText();

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Checkbox(
            value: checked,
            onChanged: (_) {
              // TODO: implement todo toggle
            },
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text.isEmpty ? 'New todo' : text,
              style: TextStyle(
                fontSize: 16,
                decoration: checked ? TextDecoration.lineThrough : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuote() {
    final text = _getText();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          border: const Border(left: BorderSide(color: Colors.blue, width: 4)),
        ),
        padding: const EdgeInsets.all(12),
        child: Text(
          text.isEmpty ? 'Quote here' : text,
          style: TextStyle(
            fontStyle: FontStyle.italic,
            fontSize: 16,
            color: Colors.grey[800],
          ),
        ),
      ),
    );
  }

  Widget _buildCode() {
    final text = _getText();
    final language = (_getText().isNotEmpty ? 'text' : 'text');

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey[900],
          borderRadius: BorderRadius.circular(4),
        ),
        padding: const EdgeInsets.all(12),
        child: Text(
          text.isEmpty ? 'code here' : text,
          style: TextStyle(
            fontFamily: 'monospace',
            fontSize: 13,
            color: Colors.green[300],
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(height: 24, thickness: 1);
  }

  Widget _buildCallout() {
    final emoji = (_getText().isNotEmpty ? '💡' : '');
    final text = _getText();

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.amber[50],
          border: Border.all(color: Colors.amber[200]!),
          borderRadius: BorderRadius.circular(4),
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            emoji.isNotEmpty ? Text(emoji) : const SizedBox.shrink(),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text.isEmpty ? 'Important!' : text,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.amber[800],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLink() {
    final url = _getLinkUrl() ?? '';
    final label = _getLinkLabel() ?? url;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: InkWell(
        onTap: () => _launchURL(url),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.blue,
            fontSize: 16,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }

  void _launchURL(String url) {
    // TODO: implement URL launching
  }

  Widget _buildImage() {
    final attachmentId = _getImageAttachmentId() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Image.network(
          'https://via.placeholder.com/400x300?text=Image+$attachmentId',
          width: double.infinity,
          height: 200,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              Container(
            width: double.infinity,
            height: 200,
            color: Colors.grey[300],
            child: const Center(
              child: Text('Image failed to load'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFile() {
    final displayName = _getFileDisplayName() ?? 'File';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          const Icon(Icons.insert_drive_file, color: Colors.blue),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              displayName,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChildPage() {
    final pageId = _getChildPageId() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: InkWell(
        onTap: () {
          // TODO: navigate to child page
        },
        child: Row(
          children: [
            const Icon(Icons.folder, color: Colors.blue),
            const SizedBox(width: 8),
            const Text('Child Page'),
          ],
        ),
      ),
    );
  }

  Widget _buildUnsupported() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8.0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        border: Border.all(color: Colors.grey, width: 1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Text(
        'Unsupported block type',
        style: TextStyle(color: Colors.grey, fontSize: 12),
      ),
    );
  }
}