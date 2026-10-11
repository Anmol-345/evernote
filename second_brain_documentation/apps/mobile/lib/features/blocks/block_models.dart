import 'package:uuid/uuid.dart';

/// Canonical block model shared between web, Flutter, and MCP.
/// This must stay in sync with the JSON Schema in contracts/block-schema.json.
class Block {
  final String id;
  final String pageId;
  final String userId;
  final String type;
  final dynamic content;
  final int position;
  final String? parentBlockId;
  final int schemaVersion;
  final int revision;
  final DateTime createdAt;
  final DateTime updatedAt;

  Block({
    required this.id,
    required this.pageId,
    required this.userId,
    required this.type,
    required this.content,
    required this.position,
    this.parentBlockId,
    required this.schemaVersion,
    required this.revision,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Block.fromJson(Map<String, dynamic> json) {
    return Block(
      id: json['id'] as String,
      pageId: json['page_id'] as String,
      userId: json['user_id'] as String,
      type: json['type'] as String,
      content: json['content'],
      position: json['position'] as int,
      parentBlockId: json['parent_block_id'] as String?,
      schemaVersion: json['schema_version'] as int,
      revision: json['revision'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'page_id': pageId,
      'user_id': userId,
      'type': type,
      'content': content,
      'position': position,
      'parent_block_id': parentBlockId,
      'schema_version': schemaVersion,
      'revision': revision,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toMap() => toJson();

  /// Convert from a web editor's internal JSON (e.g., Tiptap/ProseMirror) to canonical Block.
  /// This is the "explicit adapter" mentioned in the editor specification.
  factory Block.fromTiptapJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? 'paragraph';
    final content = json['content'] as Map<String, dynamic>? ?? {};

    // Map Tiptap block types to canonical types
    final canonicalType = _mapTiptapType(type);

    // Extract content based on type
    final canonicalContent = _extractContent(canonicalType, content);

    return Block(
      id: const Uuid().v4(),
      pageId: '',
      userId: '',
      type: canonicalType,
      content: canonicalContent,
      position: json['position'] as int? ?? 0,
      parentBlockId: null,
      schemaVersion: 1,
      revision: 1,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Map Tiptap block type to canonical block type
  static String _mapTiptapType(String tiptapType) {
    switch (tiptapType.toLowerCase()) {
      case 'paragraph':
        return 'paragraph';
      case 'heading':
        return 'heading';
      case 'bullet_list':
      case 'bulletlist':
      case 'bulleted_list_item':
        return 'bulleted_list_item';
      case 'ordered_list':
      case 'orderedlist':
      case 'numbered_list_item':
        return 'numbered_list_item';
      case 'task_list':
      case 'tasklist':
      case 'todo':
        return 'todo';
      case 'blockquote':
      case 'quote':
        return 'quote';
      case 'code_block':
      case 'codeblock':
      case 'code':
        return 'code';
      case 'horizontal_rule':
      case 'horizontalrule':
      case 'divider':
        return 'divider';
      case 'callout':
        return 'callout';
      case 'link':
        return 'link';
      case 'image':
        return 'image';
      case 'file':
        return 'file';
      case 'embed':
        return 'child_page';
      default:
        return 'paragraph'; // Unknown types default to paragraph
    }
  }

  /// Extract content from Tiptap format to canonical format
  static dynamic _extractContent(String canonicalType, Map<String, dynamic> content) {
    switch (canonicalType) {
      case 'paragraph':
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'quote':
        return {
          'rich_text': (content['rich_text'] as List<dynamic>? ?? []).map((run) => {
            'text': run['text'] ?? '',
            'marks': (run['marks'] as List<dynamic>? ?? []).map((mark) => {
              'type': mark['type'] ?? 'normal',
              if (mark['url'] != null) 'url': mark['url'],
            }).toList(),
          }).toList(),
        };

      case 'heading':
        return {
          'level': (content['level'] ?? 1) as int,
          'rich_text': (content['rich_text'] as List<dynamic>? ?? []).map((run) => {
            'text': run['text'] ?? '',
            'marks': (run['marks'] as List<dynamic>? ?? []).map((mark) => {
              'type': mark['type'] ?? 'normal',
              if (mark['url'] != null) 'url': mark['url'],
            }).toList(),
          }).toList(),
        };

      case 'todo':
        return {
          'checked': content['checked'] ?? false,
          'rich_text': (content['rich_text'] as List<dynamic>? ?? []).map((run) => {
            'text': run['text'] ?? '',
            'marks': (run['marks'] as List<dynamic>? ?? []).map((mark) => {
              'type': mark['type'] ?? 'normal',
              if (mark['url'] != null) 'url': mark['url'],
            }).toList(),
          }).toList(),
        };

      case 'code':
        return {
          'text': content['text'] ?? '',
          'language': content['language'] ?? 'text',
        };

      case 'divider':
        return <String, dynamic>{};

      case 'callout':
        return {
          'emoji': content['emoji'] ?? '',
          'rich_text': (content['rich_text'] as List<dynamic>? ?? []).map((run) => {
            'text': run['text'] ?? '',
            'marks': (run['marks'] as List<dynamic>? ?? []).map((mark) => {
              'type': mark['type'] ?? 'normal',
              if (mark['url'] != null) 'url': mark['url'],
            }).toList(),
          }).toList(),
        };

      case 'link':
        return {
          'url': content['url'] ?? '',
          'label': content['label'] ?? '',
        };

      case 'image':
        return {
          'attachment_id': content['attachment_id'] ?? '',
          'alt': content['alt'] ?? '',
        };

      case 'file':
        return {
          'attachment_id': content['attachment_id'] ?? '',
          'display_name': content['display_name'] ?? '',
        };

      case 'child_page':
        return {
          'page_id': content['page_id'] ?? '',
        };

      default:
        return content;
    }
  }
}

/// Generate a UUID v4 string
String uuidv4() {
  return const Uuid().v4();
}

/// Block type enum for type safety
enum BlockType {
  paragraph,
  heading,
  bulletedListItem,
  numberedListItem,
  todo,
  quote,
  code,
  divider,
  callout,
  link,
  image,
  file,
  childPage,
}

/// Rich text mark type
enum MarkType {
  bold,
  italic,
  underline,
  strike,
  link,
}

/// Rich text run
class RichTextRun {
  final String text;
  final List<MarkType> marks;

  RichTextRun({required this.text, required this.marks});

  factory RichTextRun.fromJson(Map<String, dynamic> json) {
    final marksList = json['marks'] as List?;
    return RichTextRun(
      text: json['text'] as String? ?? '',
      marks: marksList?.map((m) => MarkType.values.firstWhere(
        (e) => e.name == m['type'],
        orElse: () => MarkType.bold,
      )).toList() ?? <MarkType>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'marks': marks.map((m) => {
        'type': m.name,
      }).toList(),
    };
  }
}

/// Rich text array
class RichText {
  final List<RichTextRun> runs;

  RichText({required this.runs});

  factory RichText.fromJson(List<dynamic> json) {
    return RichText(
      runs: json.map((run) => RichTextRun.fromJson(Map<String, dynamic>.from(run))).toList(),
    );
  }

  List<Map<String, dynamic>> toJson() {
    return runs.map((run) => run.toJson()).toList();
  }
}