import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:second_brain_mobile/features/blocks/block_models.dart';
import 'package:second_brain_mobile/features/pages/page_models.dart';

class PageService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Get all pages for the authenticated user
  Future<List<Page>> getPages() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    final response = await _supabase
        .from('pages')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    return (response as List).map((json) => Page.fromJson(json)).toList();
  }

  // Get a single page with its blocks
  Future<PageWithBlocks> getPageWithBlocks(String pageId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Fetch page
    final pageResponse = await _supabase
        .from('pages')
        .select()
        .eq('id', pageId)
        .eq('user_id', user.id)
        .single();

    // Fetch blocks
    final blocksResponse = await _supabase
        .from('blocks')
        .select()
        .eq('page_id', pageId)
        .order('position');

    final page = Page.fromJson(pageResponse);
    final blocks = (blocksResponse as List)
        .map((json) => Block.fromJson(json))
        .toList();

    return PageWithBlocks(page: page, blocks: blocks);
  }

  // Create a new page
  Future<Page> createPage({
    required String title,
    String? parentPageId,
    String? icon,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    final response = await _supabase
        .from('pages')
        .insert({
      'title': title,
      'user_id': user.id,
      'parent_id': parentPageId,
      'icon': icon,
      'revision': 1,
    })
        .select()
        .single();

    return Page.fromJson(response);
  }

  // Update a page title
  Future<Page> updatePage({
    required String pageId,
    required String title,
    required int expectedRevision,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check revision first
    final page = await _supabase
        .from('pages')
        .select('revision')
        .eq('id', pageId)
        .single();

    if (page['revision'] != expectedRevision) {
      throw Exception('Stale revision: page has been modified');
    }

    final response = await _supabase
        .from('pages')
        .update({
      'title': title,
      'revision': expectedRevision + 1,
    })
        .eq('id', pageId)
        .select()
        .single();

    return Page.fromJson(response);
  }

  // Append blocks to a page
  Future<List<Block>> appendBlocks({
    required String pageId,
    required List<Block> blocks,
    required int expectedRevision,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check revision
    final page = await _supabase
        .from('pages')
        .select('revision')
        .eq('id', pageId)
        .single();

    if (page['revision'] != expectedRevision) {
      throw Exception('Stale revision: page has been modified');
    }

    // Insert blocks
    final blocksToInsert = blocks.map((block) {
      final blockMap = block.toMap();
      blockMap.remove('id'); // Let database generate ID
      blockMap['page_id'] = pageId;
      blockMap['user_id'] = user.id;
      blockMap['position'] = block.position;
      blockMap['revision'] = 1;
      blockMap['schema_version'] = 1;
      return blockMap;
    }).toList();

    final response = await _supabase
        .from('blocks')
        .insert(blocksToInsert)
        .select();

    return (response as List)
        .map((json) => Block.fromJson(json))
        .toList();
  }

  // Update a block
  Future<Block> updateBlock({
    required String blockId,
    required Map<String, dynamic> content,
    required int expectedRevision,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check revision
    final block = await _supabase
        .from('blocks')
        .select('revision')
        .eq('id', blockId)
        .single();

    if (block['revision'] != expectedRevision) {
      throw Exception('Stale revision: block has been modified');
    }

    final response = await _supabase
        .from('blocks')
        .update({
      'content': content,
      'updated_at': DateTime.now().toIso8601String(),
      'revision': expectedRevision + 1,
    })
        .eq('id', blockId)
        .select()
        .single();

    return Block.fromJson(response);
  }

  // Move a block to a new page and position
  Future<Block> moveBlock({
    required String blockId,
    required String targetPageId,
    required int position,
    required String? targetParentBlockId,
    required int expectedRevision,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check that target page is owned by user
    final targetPage = await _supabase
        .from('pages')
        .select()
        .eq('id', targetPageId)
        .eq('user_id', user.id)
        .single();

    if (targetPage.isEmpty) {
      throw Exception('Target page not found or access denied');
    }

    // Check revision
    final block = await _supabase
        .from('blocks')
        .select('revision')
        .eq('id', blockId)
        .single();

    if (block['revision'] != expectedRevision) {
      throw Exception('Stale revision: block has been modified');
    }

    // Update block
    final updateData = {
      'page_id': targetPageId,
      'position': position,
      if (targetParentBlockId != null)
        'parent_block_id': targetParentBlockId,
      'updated_at': DateTime.now().toIso8601String(),
    };

    final response = await _supabase
        .from('blocks')
        .update(updateData)
        .eq('id', blockId)
        .select()
        .single();

    return Block.fromJson(response);
  }

  // Add tags to a page
  Future<List<String>> addTags({
    required String pageId,
    required List<String> tags,
    required int expectedRevision,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check revision
    final page = await _supabase
        .from('pages')
        .select('revision')
        .eq('id', pageId)
        .single();

    if (page['revision'] != expectedRevision) {
      throw Exception('Stale revision: page has been modified');
    }

    final normalizedTags = tags.map((tag) => tag.toLowerCase().trim()).toList();
    final tagIds = <String>[];

    for (final tagName in normalizedTags) {
      // Check if tag already exists for this user
      final tagResponse = await _supabase
          .from('tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('normalized_name', tagName)
          .maybeSingle();

      if (tagResponse != null && tagResponse['id'] != null) {
        tagIds.add(tagResponse['id'] as String);
      } else {
        // Create new tag
        final tagInsert = await _supabase
            .from('tags')
            .insert({
          'user_id': user.id,
          'name': tagName,
          'normalized_name': tagName,
        })
            .select()
            .single();

        tagIds.add(tagInsert['id'] as String);
      }

      // Link tag to page
      await _supabase.from('page_tags').insert({
        'user_id': user.id,
        'page_id': pageId,
        'tag_id': tagIds.last,
      });
    }

    return tagIds;
  }

  // Archive a page
  Future<Page> archivePage({
    required String pageId,
    required int expectedRevision,
    required bool includeDescendants,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Check revision
    final page = await _supabase
        .from('pages')
        .select('revision')
        .eq('id', pageId)
        .single();

    if (page['revision'] != expectedRevision) {
      throw Exception('Stale revision: page has been modified');
    }

    // Archive the page
    final response = await _supabase
        .from('pages')
        .update({
      'archived_at': DateTime.now().toIso8601String(),
      'revision': expectedRevision + 1,
    })
        .eq('id', pageId)
        .select()
        .single();

    // If including descendants, archive child pages
    if (includeDescendants) {
      // Get child pages
      final childrenResponse = await _supabase
          .from('pages')
          .select()
          .eq('parent_id', pageId);

      if (childrenResponse.isNotEmpty) {
        for (final child in childrenResponse) {
          await _supabase.from('pages').update({
            'archived_at': DateTime.now().toIso8601String(),
            'revision': (response['revision'] as int) + 2,
          }).eq('id', child['id']);
        }
      }
    }

    return Page.fromJson(response);
  }
}