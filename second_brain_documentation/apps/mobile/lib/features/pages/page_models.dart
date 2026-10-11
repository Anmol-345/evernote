import 'package:second_brain_mobile/features/blocks/block_models.dart';

class Page {
  final String id;
  final String userId;
  final String title;
  final String? parentId;
  final String? icon;
  final String? coverPath;
  final int revision;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;
  final DateTime? deletedAt;

  Page({
    required this.id,
    required this.userId,
    required this.title,
    this.parentId,
    this.icon,
    this.coverPath,
    required this.revision,
    required this.createdAt,
    required this.updatedAt,
    this.archivedAt,
    this.deletedAt,
  });

  factory Page.fromJson(Map<String, dynamic> json) {
    return Page(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String? ?? 'Untitled',
      parentId: json['parent_id'] as String?,
      icon: json['icon'] as String?,
      coverPath: json['cover_path'] as String?,
      revision: json['revision'] as int? ?? 1,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
      archivedAt: json['archived_at'] != null
          ? DateTime.parse(json['archived_at'] as String)
          : null,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'parent_id': parentId,
      'icon': icon,
      'cover_path': coverPath,
      'revision': revision,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'archived_at': archivedAt?.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }

  Map<String, dynamic> toMap() => toJson();
}

class PageWithBlocks {
  final Page page;
  final List<Block> blocks;

  PageWithBlocks({
    required this.page,
    required this.blocks,
  });
}
