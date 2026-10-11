import 'package:flutter/material.dart' hide Page;
import 'package:uuid/uuid.dart';
import 'package:second_brain_mobile/features/auth/auth_service.dart';
import 'package:second_brain_mobile/features/pages/page_service.dart';
import 'package:second_brain_mobile/features/pages/page_models.dart';
import 'package:second_brain_mobile/features/blocks/block_models.dart';
import 'package:second_brain_mobile/widgets/block_renderer.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final PageService _pageService = PageService();
  final AuthService _authService = AuthService();

  late Future<List<Page>> _pagesFuture;
  String? _selectedPageId;
  Page? _selectedPage;
  List<Block> _blocks = [];
  String _pageTitle = '';
  final TextEditingController _newBlockController = TextEditingController();
  String _newBlockType = 'paragraph';
  bool _isLoading = false;
  String? _error;
  bool _isOnline = true;

  @override
  void initState() {
    super.initState();
    _init();
    _monitorConnection();
  }

  Future<void> _init() async {
    setState(() => _isLoading = true);
    _error = null;

    // Check authentication
    final user = _authService.currentUser;
    if (user == null) {
      // TODO: Navigate to sign-in
      return;
    }

    // Load pages
    _pagesFuture = _pageService.getPages();

    // Listen to connection status
    _authService.onAuthStateChanged((state) {
      // Handle auth state changes
    });
  }

  void _monitorConnection() {
    // TODO: Monitor online/offline status
    // setState(() => _isOnline = bool);
  }

  Future<void> _refreshPage(String pageId) async {
    setState(() => _isLoading = true);
    try {
      final pageWithBlocks = await _pageService.getPageWithBlocks(pageId);
      setState(() {
        _selectedPageId = pageId;
        _selectedPage = pageWithBlocks.page;
        _blocks = pageWithBlocks.blocks;
        _pageTitle = _selectedPage?.title ?? 'Untitled';
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _createPage() async {
    setState(() => _isLoading = true);
    try {
      final newPage = await _pageService.createPage(
        title: 'New Page',
        parentPageId: _selectedPageId,
      );
      // Navigate to new page
      await _refreshPage(newPage.id);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addBlock() async {
    if (_newBlockController.text.trim().isEmpty) {
      setState(() => _error = 'Block content cannot be empty');
      return;
    }

    setState(() => _isLoading = true);
    try {
      // Create block with the text content
      final block = Block(
        id: const Uuid().v4(),
        pageId: _selectedPageId!,
        userId: _authService.currentUser?.id ?? '',
        type: _newBlockType,
        content: {
          'rich_text': [
            {
              'text': _newBlockController.text.trim(),
              'marks': [],
            }
          ]
        },
        position: _blocks.length,
        schemaVersion: 1,
        revision: 1,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Append block via service
      final newBlocks = await _pageService.appendBlocks(
        pageId: _selectedPageId!,
        blocks: [block],
        expectedRevision: _selectedPage?.revision ?? 1,
      );

      setState(() {
        _blocks = newBlocks;
        _newBlockController.clear();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updatePageTitle(String title) async {
    setState(() => _isLoading = true);
    try {
      final updatedPage = await _pageService.updatePage(
        pageId: _selectedPageId!,
        title: title,
        expectedRevision: _selectedPage?.revision ?? 1,
      );
      setState(() => _pageTitle = updatedPage.title);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addTag() async {
    if (_newBlockController.text.trim().isEmpty) {
      setState(() => _error = 'Tag name cannot be empty');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final tagIds = await _pageService.addTags(
        pageId: _selectedPageId!,
        tags: [_newBlockController.text.trim()],
        expectedRevision: _selectedPage?.revision ?? 1,
      );
      // Refresh page to show new tags
      await _refreshPage(_selectedPageId!);
      _newBlockController.clear();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _showAddBlockDialog() {
    return showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add Block'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _newBlockType,
              items: const [
                DropdownMenuItem(value: 'paragraph', child: Text('Paragraph')),
                DropdownMenuItem(value: 'heading', child: Text('Heading')),
                DropdownMenuItem(value: 'bulleted_list_item', child: Text('Bullet List')),
                DropdownMenuItem(value: 'numbered_list_item', child: Text('Numbered List')),
                DropdownMenuItem(value: 'todo', child: Text('Todo')),
                DropdownMenuItem(value: 'quote', child: Text('Quote')),
                DropdownMenuItem(value: 'code', child: Text('Code')),
                DropdownMenuItem(value: 'divider', child: Text('Divider')),
                DropdownMenuItem(value: 'callout', child: Text('Callout')),
                DropdownMenuItem(value: 'link', child: Text('Link')),
                DropdownMenuItem(value: 'image', child: Text('Image')),
                DropdownMenuItem(value: 'file', child: Text('File')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _newBlockType = value);
                }
              },
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _newBlockController,
              decoration: const InputDecoration(
                labelText: 'Block content',
                hintText: 'Enter block text...',
              ),
              onSubmitted: (_) => _addBlock(),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: _addBlock,
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _selectedPage != null
            ? Text(_pageTitle)
            : const Text('Second Brain'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddBlockDialog,
            tooltip: 'Add block',
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              // TODO: Show user profile/menu
            },
            tooltip: 'Profile',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _selectedPageId != null ? () => _refreshPage(_selectedPageId!) : null,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _selectedPageId != null
                  ? Column(
                      children: [
                        // Page header
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Text(
                            _pageTitle,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        // Blocks list
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(8),
                            itemCount: _blocks.length,
                            itemBuilder: (context, index) {
                              final block = _blocks[index];
                              return BlockRenderer(block: block);
                            },
                          ),
                        ),
                        // Floating action button for new block
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: FloatingActionButton(
                            onPressed: _showAddBlockDialog,
                            tooltip: 'Add block',
                            child: const Icon(Icons.add),
                          ),
                        ),
                      ],
                    )
                  : const Center(
                      child: Text('Select a page to view'),
                    ),
    );
  }
}